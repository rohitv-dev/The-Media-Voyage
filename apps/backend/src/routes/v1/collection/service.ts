import { mediaCollection, userMedia } from "@media-voyage/shared";
import type { MediaCollectionFormSchema, MediaCollectionUpdateSchema } from "@media-voyage/shared/api";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { isStricterThan } from "../friends/policy";
import { mediaCollectionSelect, requireOwnedCollection, userMediaInCollection } from "./queries";
import { db } from "@/db/db";

export async function createMediaCollection(userId: string, input: MediaCollectionFormSchema) {
  const [collection] = await db
    .insert(mediaCollection)
    .values({
      name: input.name,
      description: input.description,
      visibility: input.visibility,
      userId,
    })
    .returning(mediaCollectionSelect);

  return collection;
}

export async function updateMediaCollection(userId: string, collectionId: string, input: MediaCollectionUpdateSchema) {
  await requireOwnedCollection(userId, collectionId);

  const [collection] = await db
    .update(mediaCollection)
    .set(input)
    .where(and(eq(mediaCollection.id, collectionId), eq(mediaCollection.userId, userId)))
    .returning(mediaCollectionSelect);

  return collection;
}

/**
 * Widens entries in a collection that are stricter than the collection itself,
 * bringing them up to its visibility. Only ever called after the owner has
 * explicitly confirmed — a collection's visibility never overrides an entry's
 * own on read.
 */
export async function bumpCollectionEntryVisibility(userId: string, collectionId: string) {
  const collection = await requireOwnedCollection(userId, collectionId);
  const target = collection.visibility;

  // A private collection shares nothing, so there is nothing to widen to.
  if (!target || target === "private") return { updated: 0 };

  const candidates = await db
    .select({ id: userMedia.id, visibility: userMedia.visibility })
    .from(userMedia)
    .where(and(eq(userMedia.userId, userId), userMediaInCollection(collectionId), isNull(userMedia.deletedAt)));

  const stricterIds = candidates.filter((entry) => isStricterThan(entry.visibility, target)).map((entry) => entry.id);

  if (!stricterIds.length) return { updated: 0 };

  const updated = await db
    .update(userMedia)
    .set({ visibility: target })
    .where(and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt), inArray(userMedia.id, stricterIds)))
    .returning({ id: userMedia.id });

  return { updated: updated.length };
}
