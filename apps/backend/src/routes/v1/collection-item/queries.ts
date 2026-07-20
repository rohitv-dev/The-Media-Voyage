import {
  media,
  mediaCollection,
  mediaCollectionItems,
  userMedia,
} from "@media-voyage/shared";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  collectionIdSelect,
  collectionItemIdSelect,
  collectionItemSelect,
  userMediaIdSelect,
} from "./selects";

export function ownedCollectionCondition(userId: string, collectionId: string) {
  return and(
    eq(mediaCollection.id, collectionId),
    eq(mediaCollection.userId, userId),
  );
}

export async function findOwnedCollection(
  userId: string,
  collectionId: string,
) {
  const [collection] = await db
    .select(collectionIdSelect)
    .from(mediaCollection)
    .where(ownedCollectionCondition(userId, collectionId))
    .limit(1);

  return collection ?? null;
}

export function listCollectionItems(collectionId: string) {
  return db
    .select(collectionItemSelect)
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(mediaCollectionItems.userMediaId, userMedia.id))
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(eq(mediaCollectionItems.collectionId, collectionId))
    .orderBy(
      asc(mediaCollectionItems.position),
      asc(mediaCollectionItems.createdAt),
    );
}

export async function findOwnedActiveUserMedia(
  userId: string,
  userMediaId: string,
) {
  const [entry] = await db
    .select(userMediaIdSelect)
    .from(userMedia)
    .where(
      and(
        eq(userMedia.id, userMediaId),
        eq(userMedia.userId, userId),
        isNull(userMedia.deletedAt),
      ),
    )
    .limit(1);

  return entry ?? null;
}

export async function findCollectionItem(
  collectionId: string,
  userMediaId: string,
) {
  const [item] = await db
    .select(collectionItemIdSelect)
    .from(mediaCollectionItems)
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collectionId),
        eq(mediaCollectionItems.userMediaId, userMediaId),
      ),
    )
    .limit(1);

  return item ?? null;
}

export async function getLastCollectionItemPosition(collectionId: string) {
  const [lastItem] = await db
    .select({ position: max(mediaCollectionItems.position) })
    .from(mediaCollectionItems)
    .where(eq(mediaCollectionItems.collectionId, collectionId));

  return lastItem?.position ?? 0;
}
