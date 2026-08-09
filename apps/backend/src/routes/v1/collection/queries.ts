import { db } from "@/db/db";
import { notFound } from "@/errors";
import { media, mediaCollection, mediaCollectionItems, userMedia } from "@media-voyage/shared";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { isStricterThan } from "../friends/policy";

export const mediaCollectionSelect = {
  id: mediaCollection.id,
  name: mediaCollection.name,
  description: mediaCollection.description,
  visibility: mediaCollection.visibility,
  pinned: mediaCollection.pinned,
  createdAt: mediaCollection.createdAt,
};

export function listMediaCollections(userId: string) {
  return db
    .select({
      ...mediaCollectionSelect,
      itemCount: count(userMedia.id),
    })
    .from(mediaCollection)
    .leftJoin(
      mediaCollectionItems,
      eq(mediaCollectionItems.collectionId, mediaCollection.id),
    )
    .leftJoin(
      userMedia,
      and(
        eq(userMedia.id, mediaCollectionItems.userMediaId),
        eq(userMedia.userId, userId),
        isNull(userMedia.deletedAt),
      ),
    )
    .where(eq(mediaCollection.userId, userId))
    .groupBy(
      mediaCollection.id,
      mediaCollection.name,
      mediaCollection.description,
      mediaCollection.visibility,
      mediaCollection.pinned,
      mediaCollection.createdAt,
    )
    .orderBy(
      desc(mediaCollection.pinned),
      asc(sql`lower(${mediaCollection.name})`),
      asc(mediaCollection.createdAt),
    );
}

/** Base ownership-check primitive, shared with the collection-item routes. */
export async function findOwnedCollection(userId: string, collectionId: string) {
  const [collection] = await db
    .select({
      id: mediaCollection.id,
      ownerId: mediaCollection.userId,
      name: mediaCollection.name,
      visibility: mediaCollection.visibility,
    })
    .from(mediaCollection)
    .where(and(eq(mediaCollection.id, collectionId), eq(mediaCollection.userId, userId)))
    .limit(1);

  return collection ?? null;
}

export async function requireOwnedCollection(userId: string, collectionId: string) {
  const collection = await findOwnedCollection(userId, collectionId);

  if (!collection) throw notFound("Collection not found");

  return collection;
}

/**
 * Entries in the collection whose own visibility is stricter than `target`
 * (defaulting to the collection's current visibility) — the ones a viewer
 * still would not see even though the collection is shared.
 */
export async function findStricterEntries(
  userId: string,
  collectionId: string,
  target?: "private" | "friends" | "public" | null,
) {
  const collection = await requireOwnedCollection(userId, collectionId);
  const collectionVisibility = target ?? collection.visibility;

  const items = await db
    .select({
      userMediaId: userMedia.id,
      title: media.title,
      visibility: userMedia.visibility,
    })
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(userMedia.id, mediaCollectionItems.userMediaId))
    .innerJoin(media, eq(media.id, userMedia.mediaId))
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collectionId),
        eq(userMedia.userId, userId),
        isNull(userMedia.deletedAt),
      ),
    );

  return {
    collectionVisibility,
    entries: items.filter((item) => isStricterThan(item.visibility, collectionVisibility)),
  };
}

/** Ids of a collection's items, used when bumping their visibility. */
export function collectionItemUserMediaIds(collectionId: string) {
  return db
    .select({ userMediaId: mediaCollectionItems.userMediaId })
    .from(mediaCollectionItems)
    .where(eq(mediaCollectionItems.collectionId, collectionId));
}

export function userMediaInCollection(collectionId: string) {
  return inArray(userMedia.id, collectionItemUserMediaIds(collectionId));
}
