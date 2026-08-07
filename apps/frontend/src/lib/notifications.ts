import { showNotification } from "@mantine/notifications";
import type { NotificationData } from "@mantine/notifications";

export function showSuccessNotification(notificationData: NotificationData) {
  showNotification({
    title: notificationData.title ?? "Success",
    color: "teal",
    position: "top-center",
    ...notificationData,
  });
}

export function showErrorNotification(notificationData: NotificationData) {
  showNotification({
    title: notificationData.title ?? "Error",
    color: "red",
    position: "top-center",
    ...notificationData,
  });
}
