import { mediaCollectionItems } from "@media-voyage/shared";
import type { ReorderMediaCollectionItems } from "@media-voyage/shared/api";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db/db";
import {
  findCollectionItem,
  findOwnedActiveUserMedia,
  findOwnedCollection,
  getLastCollectionItemPosition,
  listCollectionItems,
  listCollectionItemsDetailed,
} from "./queries";

export async function getOwnedCollectionItems(
  userId: string,
  collectionId: string,
) {
  const collection = await findOwnedCollection(userId, collectionId);

  if (!collection) {
    return { status: "collection_not_found" as const };
  }

  return {
    status: "success" as const,
    items: await listCollectionItems(collectionId),
  };
}

export async function getOwnedCollectionItemsDetailed(
  userId: string,
  collectionId: string,
) {
  const collection = await findOwnedCollection(userId, collectionId);

  if (!collection) {
    return { status: "collection_not_found" as const };
  }

  return {
    status: "success" as const,
    items: await listCollectionItemsDetailed(collectionId),
  };
}

export async function addCollectionItem(
  userId: string,
  collectionId: string,
  userMediaId: string,
) {
  const collection = await findOwnedCollection(userId, collectionId);

  if (!collection) {
    return { status: "collection_not_found" as const };
  }

  if (!userMediaId) {
    return { status: "user_media_required" as const };
  }

  const userMediaEntry = await findOwnedActiveUserMedia(userId, userMediaId);

  if (!userMediaEntry) {
    return { status: "user_media_not_found" as const };
  }

  const existing = await findCollectionItem(collectionId, userMediaId);

  if (existing) {
    return { status: "already_exists" as const };
  }

  const lastPosition = await getLastCollectionItemPosition(collectionId);
  const [item] = await db
    .insert(mediaCollectionItems)
    .values({
      collectionId,
      userMediaId,
      position: lastPosition + 1,
    })
    .returning();

  return { status: "success" as const, item };
}

export async function reorderCollectionItems(
  userId: string,
  collectionId: string,
  items: ReorderMediaCollectionItems["items"],
) {
  const collection = await findOwnedCollection(userId, collectionId);

  if (!collection) {
    return { status: "collection_not_found" as const };
  }

  if (!items.length) {
    return { status: "items_required" as const };
  }

  await Promise.all(
    items.map((item) =>
      db
        .update(mediaCollectionItems)
        .set({ position: item.position })
        .where(
          and(
            eq(mediaCollectionItems.collectionId, collectionId),
            eq(mediaCollectionItems.id, item.id),
          ),
        ),
    ),
  );

  return { status: "success" as const };
}

export async function removeCollectionItem(
  userId: string,
  collectionId: string,
  itemId: string,
) {
  const collection = await findOwnedCollection(userId, collectionId);

  if (!collection) {
    return { status: "collection_not_found" as const };
  }

  const deleted = await db
    .delete(mediaCollectionItems)
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collectionId),
        eq(mediaCollectionItems.id, itemId),
      ),
    )
    .returning();

  if (!deleted.length) {
    return { status: "item_not_found" as const };
  }

  return { status: "success" as const };
}
