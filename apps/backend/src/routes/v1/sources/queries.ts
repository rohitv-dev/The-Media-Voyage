import { sources, userMedia } from "@media-voyage/shared";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../../../db/db";
import { sourceSelect } from "./selects";

export function listSourcesWithUsage(userId: string) {
  return db
    .select({
      ...sourceSelect,
      usageCount: count(userMedia.id),
    })
    .from(sources)
    .leftJoin(userMedia, eq(userMedia.sourceId, sources.id))
    .where(eq(sources.userId, userId))
    .groupBy(sources.id)
    .orderBy(sources.name);
}

export async function findOwnedSource(userId: string, sourceId: string) {
  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)))
    .limit(1);

  return source ?? null;
}

export async function findSourceByNormalizedName(
  userId: string,
  normalizedName: string,
  excludeSourceId?: string,
) {
  const conditions = [
    eq(sources.userId, userId),
    eq(sources.normalizedName, normalizedName),
  ];

  if (excludeSourceId) {
    conditions.push(ne(sources.id, excludeSourceId));
  }

  const [source] = await db
    .select()
    .from(sources)
    .where(and(...conditions))
    .limit(1);

  return source ?? null;
}
