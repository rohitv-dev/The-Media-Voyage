import { mediaCollection } from "@media-voyage/shared";
import { eq } from "drizzle-orm";
import { mediaCollectionSelect } from "./selects";
import { db } from "../../../db/db";

export function listMediaCollections(userId: string) {
  return db
    .select(mediaCollectionSelect)
    .from(mediaCollection)
    .where(eq(mediaCollection.userId, userId));
}
