import { tags, userMediaTags } from "@media-voyage/shared";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../../../db/db";
import { tagSelect } from "./selects";

export function listTagsWithUsage(userId: string) {
  return db
    .select({
      ...tagSelect,
      usageCount: count(userMediaTags.id),
    })
    .from(tags)
    .leftJoin(userMediaTags, eq(userMediaTags.tagId, tags.id))
    .where(eq(tags.userId, userId))
    .groupBy(tags.id)
    .orderBy(tags.name);
}

export async function findOwnedTag(userId: string, tagId: string) {
  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .limit(1);

  return tag ?? null;
}

export async function findTagByNormalizedName(
  userId: string,
  normalizedName: string,
  excludeTagId?: string,
) {
  const conditions = [
    eq(tags.userId, userId),
    eq(tags.normalizedName, normalizedName),
  ];

  if (excludeTagId) {
    conditions.push(ne(tags.id, excludeTagId));
  }

  const [tag] = await db
    .select()
    .from(tags)
    .where(and(...conditions))
    .limit(1);

  return tag ?? null;
}
