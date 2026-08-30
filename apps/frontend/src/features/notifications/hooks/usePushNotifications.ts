import { authClient } from "#/auth/authClient";
import { queryKeys } from "#/lib/queryKeys";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { PushNotificationSchema } from "@capacitor/push-notifications";
import { showNotification } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

type PushListener = { remove: () => Promise<void> };
export type PushNotificationData = {
  type?: string;
  recommendationId?: string;
  friendshipId?: string;
};

async function saveDeviceToken(token: string) {
  const result = await authClient.updateUser({ deviceToken: token });

  if (result.error) {
    throw new Error(result.error.message ?? "Could not save push token");
  }
}

export async function clearPushNotificationToken() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await authClient.updateUser({ deviceToken: "" });
  } catch {
    // Logout should still complete if the token cleanup request fails.
  }
}

export function usePushNotifications(
  userId: string,
  onNotificationTap: (data: PushNotificationData) => void,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let listeners: PushListener[] = [];

    const setup = async () => {
      let permission = await PushNotifications.checkPermissions();

      if (permission.receive === "prompt") {
        permission = await PushNotifications.requestPermissions();
      }

      if (disposed || permission.receive !== "granted") return;

      listeners = await Promise.all([
        PushNotifications.addListener("registration", ({ value }) => {
          void saveDeviceToken(value).catch(() => undefined);
        }),
        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification: PushNotificationSchema) => {
            void queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.all,
            });

            if (notification.body) {
              showNotification({
                title: notification.title ?? "New notification",
                message: notification.body,
              });
            }
          },
        ),
        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          ({ notification }) => {
            const data = notification.data as PushNotificationData | undefined;

            if (
              data?.type === "friend_recommendation" ||
              data?.type === "friend_request"
            ) {
              onNotificationTap(data);
            }
          },
        ),
      ]);

      // The cleanup function can run while these async listeners are being registered.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (disposed) {
        await Promise.all(listeners.map((listener) => listener.remove()));
        listeners = [];
        return;
      }

      await PushNotifications.register();
    };

    void setup().catch(() => undefined);

    return () => {
      disposed = true;
      void Promise.all(listeners.map((listener) => listener.remove()));
    };
  }, [onNotificationTap, queryClient, userId]);
}
