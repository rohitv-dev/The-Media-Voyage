import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import type {
  MarkNotificationsSeenResponse,
  NotificationListQuery,
  NotificationListResponse,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";

const LATEST_NOTIFICATION_LIMIT = 5;
const NOTIFICATION_POLL_INTERVAL = 30_000;

async function getNotifications({ page, limit }: NotificationListQuery) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return api<NotificationListResponse>(`/notifications?${params.toString()}`);
}

export function notificationListQueryOptions(page: number, limit = 20) {
  return queryOptions({
    queryKey: queryKeys.notifications.list(page, limit),
    queryFn: () => getNotifications({ page, limit }),
    staleTime: 0,
  });
}

export const latestNotificationsQueryOptions = queryOptions({
  queryKey: queryKeys.notifications.list(1, LATEST_NOTIFICATION_LIMIT),
  queryFn: () =>
    getNotifications({ page: 1, limit: LATEST_NOTIFICATION_LIMIT }),
  staleTime: 0,
  refetchInterval: NOTIFICATION_POLL_INTERVAL,
  refetchOnWindowFocus: true,
});

export function markAllNotificationsSeen() {
  return api<MarkNotificationsSeenResponse>("/notifications/seen", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}
