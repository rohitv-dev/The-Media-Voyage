import { media, mediaCollectionItems, userMedia } from "@media-voyage/shared";
import { and, asc, eq, isNull } from "drizzle-orm";
import { userMediaSummarySelect } from "../user-media/selects";
import { db } from "@/db/db";

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
    .orderBy(
      asc(mediaCollectionItems.position),
      asc(mediaCollectionItems.createdAt),
    );
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
    .orderBy(
      asc(mediaCollectionItems.position),
      asc(mediaCollectionItems.createdAt),
    );
}
