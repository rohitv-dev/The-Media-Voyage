import {
  dismissedSystemRecommendations,
  media,
  mediaRecommendations,
  user,
  userMedia,
} from "@media-voyage/shared";
import type { RecommendationDetail } from "@media-voyage/shared/api";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/db";
import { internalServerError, notFound } from "@/errors";
import {
  recommendationCoreSelect,
  recommendationMediaSelect,
  recommendationUserSelect,
} from "./selects";

type RecommendationUser = {
  id: string;
  name: string;
  image: string | null;
};

export async function findFriendRecommendationSource(
  senderId: string,
  sourceUserMediaId: string,
) {
  const [source] = await db
    .select({
      mediaId: userMedia.mediaId,
    })
    .from(userMedia)
    .where(
      and(
        eq(userMedia.id, sourceUserMediaId),
        eq(userMedia.userId, senderId),
        isNull(userMedia.deletedAt),
      ),
    )
    .limit(1);

  if (!source) throw notFound("The media entry could not be found");

  return source;
}

export async function findSystemPreviewLibrary(userId: string) {
  return db
    .select({
      userMediaId: userMedia.id,
      title: media.title,
      type: media.type,
      catalogSource: media.source,
      externalId: media.externalId,
      status: userMedia.status,
      rating: userMedia.rating,
      favorite: userMedia.favorite,
      completedAt: userMedia.completedAt,
      updatedAt: userMedia.updatedAt,
    })
    .from(userMedia)
    .innerJoin(media, eq(media.id, userMedia.mediaId))
    .where(and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt)));
}

export async function findDismissedSystemRecommendations(userId: string) {
  return db
    .select({
      source: dismissedSystemRecommendations.source,
      externalId: dismissedSystemRecommendations.externalId,
    })
    .from(dismissedSystemRecommendations)
    .where(eq(dismissedSystemRecommendations.userId, userId));
}

export async function dismissSystemRecommendation(
  userId: string,
  source: string,
  externalId: string,
) {
  await db
    .insert(dismissedSystemRecommendations)
    .values({ userId, source, externalId })
    .onConflictDoNothing();
}

async function findProfiles(ids: string[]) {
  if (!ids.length) return new Map<string, RecommendationUser>();

  const profiles = await db
    .select(recommendationUserSelect)
    .from(user)
    .where(inArray(user.id, ids));

  return new Map(profiles.map((profile) => [profile.id, profile]));
}

async function findActiveRecipientUserMedia(userId: string, mediaId: string) {
  const [entry] = await db
    .select({ id: userMedia.id, status: userMedia.status })
    .from(userMedia)
    .where(
      and(
        eq(userMedia.userId, userId),
        eq(userMedia.mediaId, mediaId),
        isNull(userMedia.deletedAt),
      ),
    )
    .limit(1);

  return entry ?? null;
}

export async function getRecommendationDetail(
  viewerId: string,
  recommendationId: string,
): Promise<RecommendationDetail> {
  const [row] = await db
    .select({
      recommendation: recommendationCoreSelect,
      media: recommendationMediaSelect,
    })
    .from(mediaRecommendations)
    .innerJoin(media, eq(media.id, mediaRecommendations.mediaId))
    .where(eq(mediaRecommendations.id, recommendationId))
    .limit(1);

  if (!row) throw notFound("Recommendation not found");

  let viewerRole: "sender" | "recipient" | null = null;

  if (row.recommendation.recipientId === viewerId) {
    viewerRole = "recipient";
  } else if (row.recommendation.senderId === viewerId) {
    viewerRole = "sender";
  }

  if (!viewerRole) throw notFound("Recommendation not found");

  const profileIds = [
    row.recommendation.recipientId,
    row.recommendation.senderId,
  ];
  const profiles = await findProfiles(profileIds);
  const recipient = profiles.get(row.recommendation.recipientId);
  const sender = profiles.get(row.recommendation.senderId);

  if (!recipient)
    throw internalServerError(
      "The recommendation recipient could not be loaded",
    );

  if (!sender)
    throw internalServerError(
      "The recommendation sender could not be loaded",
    );

  const existingRecipientUserMedia = await findActiveRecipientUserMedia(
    row.recommendation.recipientId,
    row.recommendation.mediaId,
  );

  const common = {
    id: row.recommendation.id,
    viewerRole,
    recipient,
    media: row.media,
    status: row.recommendation.status,
    outcome: row.recommendation.outcome,
    senderNote: row.recommendation.senderNote,
    recipientNote: row.recommendation.recipientNote,
    recipientUserMediaId: row.recommendation.recipientUserMediaId,
    existingRecipientUserMediaId: existingRecipientUserMedia?.id ?? null,
    existingRecipientUserMediaStatus:
      existingRecipientUserMedia?.status ?? null,
    createdAt: row.recommendation.createdAt,
    updatedAt: row.recommendation.updatedAt,
    resolvedAt: row.recommendation.resolvedAt,
  };

  return {
    ...common,
    sender,
  };
}
