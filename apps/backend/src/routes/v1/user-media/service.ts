import { media, sources, tags, user, userMedia, userMediaStatusHistory, userMediaTags } from "@media-voyage/shared";
import type { MediaImageFocus, UserMediaFormSchema, UserMediaQuickAction } from "@media-voyage/shared/api";
import { and, eq, inArray } from "drizzle-orm";
import { conflict } from "@/errors";
import {
  ownedDeletedUserMediaCondition,
  ownedUserMediaCondition,
} from "./queries";
import { userMediaDetailedSelect, userMediaSourceName } from "./selects";
import { db } from "@/db/db";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function hasMetadataValues(value: unknown): boolean {
  return !!value && typeof value === "object" && Object.keys(value).length > 0;
}

async function syncUserMediaTags(
  tx: DbTransaction,
  userId: string,
  userMediaId: string,
  tagNames: string[] | null | undefined,
) {
  if (tagNames === undefined) return;

  if (tagNames === null) {
    await tx.delete(userMediaTags).where(eq(userMediaTags.userMediaId, userMediaId));
    return;
  }

  const cleanedNames = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))];

  if (!cleanedNames.length) {
    await tx.delete(userMediaTags).where(eq(userMediaTags.userMediaId, userMediaId));
    return;
  }

  const normalizedNames = cleanedNames.map((name) => name.toLowerCase());

  const existingTags = await tx
    .select()
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.normalizedName, normalizedNames)));

  const existingByNormalized = new Map(existingTags.map((tag) => [tag.normalizedName, tag]));

  const missingNames = cleanedNames.filter((name) => !existingByNormalized.has(name.toLowerCase()));

  const createdTags = missingNames.length
    ? await tx
        .insert(tags)
        .values(
          missingNames.map((name) => ({
            userId,
            name,
            normalizedName: name.toLowerCase(),
          })),
        )
        .returning()
    : [];

  const tagIdByNormalized = new Map([...existingTags, ...createdTags].map((tag) => [tag.normalizedName, tag.id]));

  await tx.delete(userMediaTags).where(eq(userMediaTags.userMediaId, userMediaId));

  await tx.insert(userMediaTags).values(
    normalizedNames.map((normalizedName) => ({
      userMediaId,
      tagId: tagIdByNormalized.get(normalizedName)!,
    })),
  );
}

async function resolveSourceId(
  tx: DbTransaction,
  userId: string,
  sourceName: string | null | undefined,
): Promise<string | null | undefined> {
  if (sourceName === undefined) return undefined;
  if (sourceName === null) return null;

  const trimmed = sourceName.trim();
  if (!trimmed) return null;

  const normalizedName = trimmed.toLowerCase();

  const [existing] = await tx
    .select()
    .from(sources)
    .where(and(eq(sources.userId, userId), eq(sources.normalizedName, normalizedName)))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await tx.insert(sources).values({ userId, name: trimmed, normalizedName }).returning();

  return created.id;
}

/**
 * New entries inherit the account's default visibility unless the form set one
 * explicitly, so sharing a library doesn't mean revisiting every new addition.
 */
async function resolveDefaultVisibility(tx: DbTransaction, userId: string) {
  const [row] = await tx
    .select({ defaultVisibility: user.defaultVisibility })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row?.defaultVisibility ?? "private";
}

/**
 * Ensures that a user has an active Planned entry for an existing canonical
 * media record. The caller owns the surrounding transaction so this helper
 * can be composed with other writes, such as recommendation resolution.
 */
export async function ensurePlannedUserMediaForMedia(
  tx: DbTransaction,
  userId: string,
  mediaId: string,
) {
  const [existing] = await tx
    .select({ id: userMedia.id, deletedAt: userMedia.deletedAt })
    .from(userMedia)
    .where(and(eq(userMedia.userId, userId), eq(userMedia.mediaId, mediaId)))
    .for("update")
    .limit(1);

  if (existing) {
    if (existing.deletedAt) {
      throw conflict("This media is in your trash. Restore it before adding it again.");
    }

    return { id: existing.id, created: false };
  }

  const statusChangedAt = new Date();
  const [createdUserMedia] = await tx
    .insert(userMedia)
    .values({
      userId,
      mediaId,
      status: "planned",
      statusChangedAt,
      visibility: await resolveDefaultVisibility(tx, userId),
    })
    .returning({ id: userMedia.id });

  await tx.insert(userMediaStatusHistory).values({
    userMediaId: createdUserMedia.id,
    fromStatus: null,
    toStatus: "planned",
    source: "recommendation",
    changedAt: statusChangedAt,
  });

  return { id: createdUserMedia.id, created: true };
}

export async function createUserMedia(userId: string, input: UserMediaFormSchema) {
  const {
    title,
    type,
    externalId,
    imageUrl,
    description,
    metadata,
    mediaSource,
    tags: tagNames,
    source: sourceName,
  } = input;

  return db.transaction(async (tx) => {
    let mediaId = input.mediaId;

    if (!mediaId && externalId && mediaSource) {
      const [existingMedia] = await tx
        .select({
          id: media.id,
          description: media.description,
          metadata: media.metadata,
        })
        .from(media)
        .where(and(eq(media.source, mediaSource), eq(media.externalId, externalId)))
        .limit(1);

      if (existingMedia) {
        mediaId = existingMedia.id;

        const metadataUpdate = metadata && !hasMetadataValues(existingMedia.metadata) ? metadata : undefined;

        if ((description && !existingMedia.description) || metadataUpdate) {
          await tx
            .update(media)
            .set({
              ...(description && !existingMedia.description ? { description } : {}),
              ...(metadataUpdate ? { metadata: metadataUpdate } : {}),
            })
            .where(eq(media.id, existingMedia.id));
        }
      }
    }

    if (!mediaId) {
      const [createdMedia] = await tx
        .insert(media)
        .values({
          title,
          type,
          externalId: externalId || null,
          imageUrl,
          description: description || null,
          metadata: metadata ?? {},
          source: mediaSource,
        })
        .returning({ id: media.id });

      mediaId = createdMedia.id;
    }

    const [existingUserMedia] = await tx
      .select({ id: userMedia.id, deletedAt: userMedia.deletedAt })
      .from(userMedia)
      .where(and(eq(userMedia.userId, userId), eq(userMedia.mediaId, mediaId)))
      .for("update")
      .limit(1);

    if (existingUserMedia) {
      if (existingUserMedia.deletedAt) {
        throw conflict("This media is in your trash. Restore it before adding it again.");
      }

      const [record] = await tx
        .select(userMediaDetailedSelect)
        .from(userMedia)
        .innerJoin(media, eq(userMedia.mediaId, media.id))
        .where(eq(userMedia.id, existingUserMedia.id))
        .limit(1);

      return record;
    }

    const sourceId = await resolveSourceId(tx, userId, sourceName);

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
        pagesRead: input.pagesRead,
        sourceId: sourceId ?? null,
        visibility: input.visibility ?? (await resolveDefaultVisibility(tx, userId)),
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

    await syncUserMediaTags(tx, userId, createdUserMedia.id, tagNames);

    const [record] = await tx
      .select(userMediaDetailedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(eq(userMedia.id, createdUserMedia.id))
      .limit(1);

    return record;
  });
}

export async function updateUserMedia(userId: string, id: string, input: UserMediaFormSchema) {
  const { title: _title, type: _type, mediaId: _mediaId, tags: tagNames, source: sourceName, ...updates } = input;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        progress: userMedia.progress,
        status: userMedia.status,
        statusChangedAt: userMedia.statusChangedAt,
        lastProgressUpdate: userMedia.lastProgressUpdate,
      })
      .from(userMedia)
      .where(ownedUserMediaCondition(userId, id))
      .for("update")
      .limit(1);

    if (!existing) return null;

    const sourceId = await resolveSourceId(tx, userId, sourceName);

    const progressChanged = updates.progress !== undefined && updates.progress !== existing.progress;
    const startedProgress = updates.status === "in_progress" && existing.status !== "in_progress";
    const statusChanged = updates.status !== undefined && updates.status !== existing.status;
    const now = new Date();

    const [updated] = await tx
      .update(userMedia)
      .set({
        ...updates,
        ...(sourceId !== undefined ? { sourceId } : {}),
        updatedAt: now,
        statusChangedAt: statusChanged ? now : existing.statusChangedAt,
        lastProgressUpdate: progressChanged || startedProgress ? now : existing.lastProgressUpdate,
      })
      .where(ownedUserMediaCondition(userId, id))
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

    await syncUserMediaTags(tx, userId, updated.id, tagNames);

    const [record] = await tx
      .select(userMediaDetailedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(ownedUserMediaCondition(userId, updated.id))
      .limit(1);

    return record ?? null;
  });
}

export async function updateUserMediaQuickActions(userId: string, id: string, quickAction: UserMediaQuickAction) {
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
    const statusChanged = quickAction.status !== undefined && quickAction.status !== existing.status;

    const updates: Partial<typeof userMedia.$inferInsert> = {
      ...quickAction,
      updatedAt: now,
    };

    if (quickAction.progress !== undefined || (statusChanged && quickAction.status === "in_progress")) {
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
        source: userMediaSourceName,
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

export async function updateUserMediaImageFocus(userId: string, id: string, input: MediaImageFocus) {
  return db.transaction(async (tx) => {
    const [entry] = await tx
      .select({ mediaId: userMedia.mediaId })
      .from(userMedia)
      .where(ownedUserMediaCondition(userId, id))
      .for("update")
      .limit(1);

    if (!entry) return null;

    await tx
      .update(media)
      .set({
        imageFocusX: input.imageFocusX,
        imageFocusY: input.imageFocusY,
        updatedAt: new Date(),
      })
      .where(eq(media.id, entry.mediaId));

    const [record] = await tx
      .select(userMediaDetailedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(ownedUserMediaCondition(userId, id))
      .limit(1);

    return record ?? null;
  });
}

export async function deleteUserMedia(userId: string, id: string) {
  const now = new Date();
  const [deleted] = await db
    .update(userMedia)
    .set({ deletedAt: now, updatedAt: now })
    .where(ownedUserMediaCondition(userId, id))
    .returning({ id: userMedia.id });

  return deleted ?? null;
}

export async function restoreUserMedia(userId: string, id: string) {
  const [restored] = await db
    .update(userMedia)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(ownedDeletedUserMediaCondition(userId, id))
    .returning({ id: userMedia.id });

  return restored ?? null;
}

export async function permanentlyDeleteUserMedia(userId: string, id: string) {
  const [deleted] = await db
    .delete(userMedia)
    .where(ownedDeletedUserMediaCondition(userId, id))
    .returning({ id: userMedia.id });

  return deleted ?? null;
}
