import { db } from "@/db/db";
import {
  media,
  mediaRecommendations,
  notifications,
  user,
  userMedia,
} from "@media-voyage/shared";
import type {
  MarkNotificationsSeenResponse,
  NotificationListQuery,
  NotificationListResponse,
} from "@media-voyage/shared/api";
import { aliasedTable } from "drizzle-orm";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";

const recommendationMedia = aliasedTable(media, "recommendation_media");

type NotificationWriter = Pick<typeof db, "insert">;
type NotificationInsert = typeof notifications.$inferInsert;
type CreateNotificationInput = Pick<
  NotificationInsert,
  "recipientId" | "actorId" | "type"
> & {
  userMediaId?: NotificationInsert["userMediaId"];
  recommendationId?: NotificationInsert["recommendationId"];
};

export async function createNotification(
  database: NotificationWriter,
  input: CreateNotificationInput,
) {
  await database.insert(notifications).values(input);
}

export async function listNotifications(
  userId: string,
  { page, limit }: NotificationListQuery,
): Promise<NotificationListResponse> {
  const [data, [totalRow], [unseenRow]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        actorName: user.name,
        actorImage: user.image,
        userMediaId: notifications.userMediaId,
        recommendationId: notifications.recommendationId,
        recommendationOutcome: mediaRecommendations.outcome,
        mediaTitle: sql<
          string | null
        >`coalesce(${media.title}, ${recommendationMedia.title})`,
        seenAt: notifications.seenAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .innerJoin(user, eq(user.id, notifications.actorId))
      .leftJoin(userMedia, eq(userMedia.id, notifications.userMediaId))
      .leftJoin(media, eq(media.id, userMedia.mediaId))
      .leftJoin(
        mediaRecommendations,
        eq(mediaRecommendations.id, notifications.recommendationId),
      )
      .leftJoin(
        recommendationMedia,
        eq(recommendationMedia.id, mediaRecommendations.mediaId),
      )
      .where(eq(notifications.recipientId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.recipientId, userId)),
    db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.seenAt),
        ),
      ),
  ]);

  return {
    data,
    total: totalRow?.count ?? 0,
    unseenCount: unseenRow?.count ?? 0,
    page,
    pageSize: limit,
  };
}

export async function markAllNotificationsSeen(
  userId: string,
): Promise<MarkNotificationsSeenResponse> {
  const updated = await db
    .update(notifications)
    .set({ seenAt: new Date() })
    .where(
      and(eq(notifications.recipientId, userId), isNull(notifications.seenAt)),
    )
    .returning({ id: notifications.id });

  return { updated: updated.length };
}
