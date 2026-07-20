import { media, userMedia, userMediaStatusHistory } from "@media-voyage/shared";
import type {
  UserMediaFormSchema,
  UserMediaQuickAction,
} from "@media-voyage/shared/api";
import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  ownedUserMediaCondition,
  ownedUserMediaIncludingDeletedCondition,
} from "./queries";
import { userMediaCreatedSelect, userMediaDetailedSelect } from "./selects";

export async function createUserMedia(
  userId: string,
  input: UserMediaFormSchema,
) {
  const { title, type, externalId, imageUrl, releaseDate, mediaSource } = input;

  return db.transaction(async (tx) => {
    let mediaId = input.mediaId;

    if (!mediaId) {
      const [createdMedia] = await tx
        .insert(media)
        .values({
          title,
          type,
          externalId,
          imageUrl,
          releaseDate,
          source: mediaSource,
        })
        .returning({ id: media.id });

      mediaId = createdMedia.id;
    }

    const statusChangedAt = new Date();
    const [createdUserMedia] = await tx
      .insert(userMedia)
      .values({
        userId,
        mediaId,
        status: input.status,
        statusChangedAt,
        rating: input.rating,
        review: input.review,
        notes: input.notes,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        progress: input.progress,
        favorite: input.favorite,
        rewatches: input.rewatches,
        timeSpent: input.timeSpent,
        source: input.source,
        tags: input.tags,
        visibility: input.visibility,
        customFields: input.customFields,
        seasonsProgress: input.seasonsProgress,
      })
      .returning({
        id: userMedia.id,
        status: userMedia.status,
        progress: userMedia.progress,
      });

    await tx.insert(userMediaStatusHistory).values({
      userMediaId: createdUserMedia.id,
      fromStatus: null,
      toStatus: createdUserMedia.status,
      progressSnapshot: createdUserMedia.progress,
      source: "created",
      changedAt: statusChangedAt,
    });

    const [record] = await tx
      .select(userMediaCreatedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(eq(userMedia.id, createdUserMedia.id))
      .limit(1);

    return record;
  });
}

export async function updateUserMedia(
  userId: string,
  id: string,
  input: UserMediaFormSchema,
) {
  const { title: _title, type: _type, mediaId: _mediaId, ...updates } = input;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        progress: userMedia.progress,
        status: userMedia.status,
        statusChangedAt: userMedia.statusChangedAt,
        lastProgressUpdate: userMedia.lastProgressUpdate,
      })
      .from(userMedia)
      .where(ownedUserMediaIncludingDeletedCondition(userId, id))
      .for("update")
      .limit(1);

    if (!existing) return null;

    const progressChanged =
      updates.progress !== undefined && updates.progress !== existing.progress;
    const startedProgress =
      updates.status === "in_progress" && existing.status !== "in_progress";
    const statusChanged =
      updates.status !== undefined && updates.status !== existing.status;
    const now = new Date();

    const [updated] = await tx
      .update(userMedia)
      .set({
        ...updates,
        statusChangedAt: statusChanged ? now : existing.statusChangedAt,
        lastProgressUpdate:
          progressChanged || startedProgress
            ? now
            : existing.lastProgressUpdate,
      })
      .where(ownedUserMediaIncludingDeletedCondition(userId, id))
      .returning({
        id: userMedia.id,
        status: userMedia.status,
        progress: userMedia.progress,
      });

    if (!updated) return null;

    if (statusChanged) {
      await tx.insert(userMediaStatusHistory).values({
        userMediaId: updated.id,
        fromStatus: existing.status,
        toStatus: updated.status,
        progressSnapshot: updated.progress,
        source: "form",
        changedAt: now,
      });
    }

    const [record] = await tx
      .select(userMediaDetailedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(ownedUserMediaIncludingDeletedCondition(userId, updated.id))
      .limit(1);

    return record ?? null;
  });
}

export async function updateUserMediaQuickActions(
  userId: string,
  id: string,
  quickAction: UserMediaQuickAction,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        status: userMedia.status,
        progress: userMedia.progress,
      })
      .from(userMedia)
      .where(ownedUserMediaCondition(userId, id))
      .for("update")
      .limit(1);

    if (!existing) return null;

    const now = new Date();
    const statusChanged =
      quickAction.status !== undefined &&
      quickAction.status !== existing.status;
    const updates: Partial<typeof userMedia.$inferInsert> = {
      ...quickAction,
      updatedAt: now,
    };

    if (
      quickAction.progress !== undefined ||
      (statusChanged && quickAction.status === "in_progress")
    ) {
      updates.lastProgressUpdate = now;
    }

    if (statusChanged) {
      updates.statusChangedAt = now;

      if (quickAction.status === "completed") {
        updates.completedAt = now;
        updates.progress = 100;
        updates.lastProgressUpdate = now;
      } else {
        updates.completedAt = null;
      }
    }

    const [updated] = await tx
      .update(userMedia)
      .set(updates)
      .where(ownedUserMediaCondition(userId, id))
      .returning({
        id: userMedia.id,
        status: userMedia.status,
        progress: userMedia.progress,
        rating: userMedia.rating,
        favorite: userMedia.favorite,
        source: userMedia.source,
        lastProgressUpdate: userMedia.lastProgressUpdate,
        createdAt: userMedia.createdAt,
        updatedAt: userMedia.updatedAt,
      });

    if (!updated) return null;

    if (statusChanged) {
      await tx.insert(userMediaStatusHistory).values({
        userMediaId: updated.id,
        fromStatus: existing.status,
        toStatus: updated.status,
        progressSnapshot: updated.progress,
        source: "quick_action",
        changedAt: now,
      });
    }

    const [catalogRecord] = await tx
      .select({ title: media.title, type: media.type })
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(ownedUserMediaCondition(userId, id))
      .limit(1);

    return { ...updated, ...catalogRecord };
  });
}
