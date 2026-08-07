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

  await db.transaction(async (tx) => {
    const existingItems = await tx
      .select({ id: mediaCollectionItems.id })
      .from(mediaCollectionItems)
      .where(eq(mediaCollectionItems.collectionId, collectionId))
      .for("update");
    const existingIds = new Set(existingItems.map((item) => item.id));

    if (
      existingIds.size !== items.length ||
      items.some((item) => !existingIds.has(item.id))
    ) {
      throw conflict("Collection changed. Refresh and try again.");
    }

    for (const item of items) {
      const [updated] = await tx
        .update(mediaCollectionItems)
        .set({ position: item.position })
        .where(
          and(
            eq(mediaCollectionItems.collectionId, collectionId),
            eq(mediaCollectionItems.id, item.id),
          ),
        )
        .returning({ id: mediaCollectionItems.id });

      if (!updated) {
        throw conflict("Collection changed. Refresh and try again.");
      }
    }
  });
}

export async function removeCollectionItem(userId: string, collectionId: string, itemId: string) {
  await requireOwnedCollection(userId, collectionId);

  const deleted = await db
    .delete(mediaCollectionItems)
    .where(and(eq(mediaCollectionItems.collectionId, collectionId), eq(mediaCollectionItems.id, itemId)))
    .returning();

  if (!deleted.length) throw notFound("Collection item not found");
}
