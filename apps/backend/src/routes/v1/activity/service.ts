import { activityEvents } from "@media-voyage/shared";
import type {
  ActivityDetails,
  ActivityListQuery,
  ActivityListResponse,
} from "@media-voyage/shared/api";
import { count, desc, eq } from "drizzle-orm";
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
  { page, limit }: ActivityListQuery,
): Promise<ActivityListResponse> {
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
      .where(eq(activityEvents.userId, userId))
      .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: count() })
      .from(activityEvents)
      .where(eq(activityEvents.userId, userId)),
  ]);

  return {
    data,
    total: totalRow?.count ?? 0,
    page,
    pageSize: limit,
  };
}
