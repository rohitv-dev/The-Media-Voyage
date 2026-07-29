import { notifications } from "@media-voyage/shared";
import type { MarkNotificationsSeenResponse } from "@media-voyage/shared/api";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/db";

type NotificationWriter = Pick<typeof db, "insert">;
type NotificationInsert = typeof notifications.$inferInsert;
type CreateNotificationInput = Pick<
  NotificationInsert,
  "recipientId" | "actorId" | "type"
> & {
  userMediaId?: NotificationInsert["userMediaId"];
};

export async function createNotification(
  database: NotificationWriter,
  input: CreateNotificationInput,
) {
  await database.insert(notifications).values(input);
}

export async function markAllNotificationsSeen(
  userId: string,
): Promise<MarkNotificationsSeenResponse> {
  const updated = await db
    .update(notifications)
    .set({ seenAt: new Date() })
    .where(
      and(
        eq(notifications.recipientId, userId),
        isNull(notifications.seenAt),
      ),
    )
    .returning({ id: notifications.id });

  return { updated: updated.length };
}
