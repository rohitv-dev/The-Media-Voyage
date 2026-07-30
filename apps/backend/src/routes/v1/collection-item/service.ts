import { mediaCollectionItems } from "@media-voyage/shared";
import type { ReorderMediaCollectionItems } from "@media-voyage/shared/api";
import { and, eq } from "drizzle-orm";
import { badRequest, conflict, notFound } from "../../../errors";
import { requireOwnedCollection } from "../collection/queries";
import {
  findCollectionItem,
  findOwnedActiveUserMedia,
  getLastCollectionItemPosition,
  listCollectionItems,
  listCollectionItemsDetailed,
} from "./queries";
import { db } from "@/db/db";

export async function getOwnedCollectionItems(userId: string, collectionId: string) {
  await requireOwnedCollection(userId, collectionId);

  return listCollectionItems(collectionId);
}

export async function getOwnedCollectionItemsDetailed(userId: string, collectionId: string) {
  await requireOwnedCollection(userId, collectionId);

  return listCollectionItemsDetailed(collectionId);
}

export async function addCollectionItem(userId: string, collectionId: string, userMediaId: string) {
  await requireOwnedCollection(userId, collectionId);

  const userMediaEntry = await findOwnedActiveUserMedia(userId, userMediaId);

  if (!userMediaEntry) throw notFound("Selected media entry not found");

  const existing = await findCollectionItem(collectionId, userMediaId);

  if (existing) throw conflict("Media is already in this collection");

  const lastPosition = await getLastCollectionItemPosition(collectionId);
  const [item] = await db
    .insert(mediaCollectionItems)
    .values({
      collectionId,
      userMediaId,
      position: lastPosition + 1,
    })
    .returning();

  return item;
}

export async function reorderCollectionItems(
  userId: string,
  collectionId: string,
  items: ReorderMediaCollectionItems["items"],
) {
  await requireOwnedCollection(userId, collectionId);

  if (!items.length) throw badRequest("items are required");

  await Promise.all(
    items.map((item) =>
      db
        .update(mediaCollectionItems)
        .set({ position: item.position })
        .where(and(eq(mediaCollectionItems.collectionId, collectionId), eq(mediaCollectionItems.id, item.id))),
    ),
  );
}

export async function removeCollectionItem(userId: string, collectionId: string, itemId: string) {
  await requireOwnedCollection(userId, collectionId);

  const deleted = await db
    .delete(mediaCollectionItems)
    .where(and(eq(mediaCollectionItems.collectionId, collectionId), eq(mediaCollectionItems.id, itemId)))
    .returning();

  if (!deleted.length) throw notFound("Collection item not found");
}
