import { media, mediaCollectionItems, userMedia } from "@media-voyage/shared";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { userMediaSummarySelect } from "../user-media/selects";
import { db } from "@/db/db";

const userMediaIdSelect = {
  id: userMedia.id,
};

const collectionItemIdSelect = {
  id: mediaCollectionItems.id,
};

const collectionItemSelect = {
  id: mediaCollectionItems.id,
  userMediaId: mediaCollectionItems.userMediaId,
  title: media.title,
  type: media.type,
  position: mediaCollectionItems.position,
  createdAt: mediaCollectionItems.createdAt,
};

const collectionItemDetailedSelect = {
  ...userMediaSummarySelect,
  position: mediaCollectionItems.position,
};

export function listCollectionItems(collectionId: string) {
  return db
    .select(collectionItemSelect)
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(mediaCollectionItems.userMediaId, userMedia.id))
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collectionId),
        isNull(userMedia.deletedAt),
      ),
    )
    .orderBy(asc(mediaCollectionItems.position), asc(mediaCollectionItems.createdAt));
}

export function listCollectionItemsDetailed(collectionId: string) {
  return db
    .select(collectionItemDetailedSelect)
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(mediaCollectionItems.userMediaId, userMedia.id))
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collectionId),
        isNull(userMedia.deletedAt),
      ),
    )
    .orderBy(asc(mediaCollectionItems.position), asc(mediaCollectionItems.createdAt));
}

export async function findOwnedActiveUserMedia(userId: string, userMediaId: string) {
  const [entry] = await db
    .select(userMediaIdSelect)
    .from(userMedia)
    .where(and(eq(userMedia.id, userMediaId), eq(userMedia.userId, userId), isNull(userMedia.deletedAt)))
    .limit(1);

  return entry ?? null;
}

export async function findCollectionItem(collectionId: string, userMediaId: string) {
  const [item] = await db
    .select(collectionItemIdSelect)
    .from(mediaCollectionItems)
    .where(and(eq(mediaCollectionItems.collectionId, collectionId), eq(mediaCollectionItems.userMediaId, userMediaId)))
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
