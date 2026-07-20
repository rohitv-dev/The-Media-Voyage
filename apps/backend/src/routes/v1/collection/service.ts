import { mediaCollection } from "@media-voyage/shared";
import type { MediaCollectionFormSchema } from "@media-voyage/shared/api";
import { db } from "../../../db/db";

export async function createMediaCollection(
  userId: string,
  input: MediaCollectionFormSchema,
) {
  const [collection] = await db
    .insert(mediaCollection)
    .values({
      name: input.name,
      description: input.description,
      visibility: input.visibility,
      userId,
    })
    .returning();

  return collection;
}
