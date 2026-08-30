import { media, mediaRecommendations, userMedia } from "@media-voyage/shared";
import type {
  CreateFriendRecommendationInput,
  CreateRecommendationResponse,
  RecommendationResolutionResponse,
  ResolveRecommendationInput,
} from "@media-voyage/shared/api";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/db";
import { badRequest, conflict, notFound } from "@/errors";
import { ensurePlannedUserMediaForMedia } from "../user-media/service";
import type { DbTransaction } from "../user-media/service";
import { createNotification } from "../notifications/service";
import { recordActivity } from "../activity/service";
import { areFriends } from "../friends/queries";
import { findFriendRecommendationSource } from "./queries";

export async function createFriendRecommendation(
  senderId: string,
  input: CreateFriendRecommendationInput,
): Promise<CreateRecommendationResponse> {
  if (senderId === input.recipientId) {
    throw badRequest("You can't recommend media to yourself");
  }

  const isFriend = await areFriends(senderId, input.recipientId);

  if (!isFriend) {
    throw notFound("Friend not found");
  }

  const source = await findFriendRecommendationSource(
    senderId,
    input.sourceUserMediaId,
  );

  const created = await db.transaction(async (tx) => {
    const [recommendation] = await tx
      .insert(mediaRecommendations)
      .values({
        recipientId: input.recipientId,
        senderId,
        mediaId: source.mediaId,
        senderNote: input.senderNote || null,
      })
      .onConflictDoNothing()
      .returning({
        id: mediaRecommendations.id,
        status: mediaRecommendations.status,
      });

    if (!recommendation) {
      throw conflict(
        "You already have a pending recommendation for this friend",
      );
    }

    await createNotification(tx, {
      recipientId: input.recipientId,
      actorId: senderId,
      type: "friend_recommendation",
      recommendationId: recommendation.id,
    });

    return recommendation;
  });

  return {
    id: created.id,
    status: "pending",
  };
}

async function findRecipientEntry(
  tx: DbTransaction,
  recipientId: string,
  mediaId: string,
) {
  const [entry] = await tx
    .select({ id: userMedia.id })
    .from(userMedia)
    .where(
      and(
        eq(userMedia.userId, recipientId),
        eq(userMedia.mediaId, mediaId),
        isNull(userMedia.deletedAt),
      ),
    )
    .limit(1);

  return entry?.id ?? null;
}

export async function resolveRecommendation(
  recipientId: string,
  recommendationId: string,
  input: ResolveRecommendationInput,
): Promise<{
  recipientId: string;
  response: RecommendationResolutionResponse;
}> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: mediaRecommendations.id,
        senderId: mediaRecommendations.senderId,
        mediaId: mediaRecommendations.mediaId,
        status: mediaRecommendations.status,
      })
      .from(mediaRecommendations)
      .where(
        and(
          eq(mediaRecommendations.id, recommendationId),
          eq(mediaRecommendations.recipientId, recipientId),
        ),
      )
      .for("update")
      .limit(1);

    if (!existing) throw notFound("Recommendation not found");

    if (existing.status !== "pending") {
      throw conflict("This recommendation has already been resolved");
    }

    let recipientUserMediaId = await findRecipientEntry(
      tx,
      recipientId,
      existing.mediaId,
    );
    let recipientUserMediaCreated = false;

    if (input.outcome === "added_to_library" || input.addToLibrary) {
      const ensured = await ensurePlannedUserMediaForMedia(
        tx,
        recipientId,
        existing.mediaId,
      );
      recipientUserMediaId = ensured.id;
      recipientUserMediaCreated = ensured.created;

      if (ensured.created) {
        const [mediaRecord] = await tx
          .select({ title: media.title })
          .from(media)
          .where(eq(media.id, existing.mediaId))
          .limit(1);

        await recordActivity(tx, {
          userId: recipientId,
          type: "media_added",
          userMediaId: ensured.id,
          details: {
            mediaTitle: mediaRecord?.title ?? "Media",
            source: "recommendation",
          },
        });
      }
    }

    const now = new Date();
    const [updated] = await tx
      .update(mediaRecommendations)
      .set({
        status: "resolved",
        outcome: input.outcome,
        recipientNote: input.recipientNote || null,
        recipientUserMediaId,
        resolvedAt: now,
      })
      .where(
        and(
          eq(mediaRecommendations.id, recommendationId),
          eq(mediaRecommendations.status, "pending"),
        ),
      )
      .returning({
        id: mediaRecommendations.id,
        outcome: mediaRecommendations.outcome,
        recipientUserMediaId: mediaRecommendations.recipientUserMediaId,
      });

    if (!updated)
      throw conflict("This recommendation has already been resolved");

    await createNotification(tx, {
      recipientId: existing.senderId,
      actorId: recipientId,
      type: "friend_recommendation_response",
      recommendationId: existing.id,
    });

    return {
      recipientId: existing.senderId,
      response: {
        id: updated.id,
        status: "resolved",
        outcome: updated.outcome!,
        recipientUserMediaId: updated.recipientUserMediaId,
        recipientUserMediaCreated,
      },
    };
  });
}
