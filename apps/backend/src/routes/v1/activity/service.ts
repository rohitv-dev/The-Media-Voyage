import { activityEvents, media, userMedia } from "@media-voyage/shared";
import type {
  ActivityDetails,
  ActivityListQuery,
  ActivityListResponse,
} from "@media-voyage/shared/api";
import { and, count, desc, eq, gte, ilike, lt, sql } from "drizzle-orm";
import { db } from "@/db/db";

type ActivityWriter = Pick<typeof db, "insert">;
type ActivityInsert = typeof activityEvents.$inferInsert;

type RecordActivityInput = Pick<ActivityInsert, "userId" | "type"> & {
  userMediaId?: ActivityInsert["userMediaId"];
  details: ActivityDetails;
};

export async function recordActivity(
  database: ActivityWriter,
  input: RecordActivityInput,
) {
  await database.insert(activityEvents).values(input);
}

export async function listActivity(
  userId: string,
  { page, limit, action, type, search, from, to }: ActivityListQuery,
): Promise<ActivityListResponse> {
  const condition = and(
    eq(activityEvents.userId, userId),
    action ? eq(activityEvents.type, action) : undefined,
    type ? eq(media.type, type) : undefined,
    search
      ? ilike(
          sql`coalesce(nullif(${activityEvents.details}->>'mediaTitle', ''), 'Media')`,
          `%${search.replace(/[\\%_]/g, "\\$&")}%`,
        )
      : undefined,
    from ? gte(activityEvents.createdAt, new Date(from)) : undefined,
    to ? lt(activityEvents.createdAt, new Date(to)) : undefined,
  );

  const [data, [totalRow]] = await Promise.all([
    db
      .select({
        id: activityEvents.id,
        type: activityEvents.type,
        userMediaId: activityEvents.userMediaId,
        details: activityEvents.details,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .leftJoin(userMedia, eq(activityEvents.userMediaId, userMedia.id))
      .leftJoin(media, eq(userMedia.mediaId, media.id))
      .where(condition)
      .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: count() })
      .from(activityEvents)
      .leftJoin(userMedia, eq(activityEvents.userMediaId, userMedia.id))
      .leftJoin(media, eq(userMedia.mediaId, media.id))
      .where(condition),
  ]);

  return {
    data,
    total: totalRow?.count ?? 0,
    page,
    pageSize: limit,
  };
}
