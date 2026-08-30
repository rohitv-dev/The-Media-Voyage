// @vitest-environment jsdom

import { authClient } from "#/auth/authClient";
import {
  clearPushNotificationToken,
  usePushNotifications,
} from "./usePushNotifications";
import type { PushNotificationData } from "./usePushNotifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  addListenerMock,
  checkPermissionsMock,
  registerMock,
  requestPermissionsMock,
  updateUserMock,
} = vi.hoisted(() => ({
  addListenerMock: vi.fn(),
  checkPermissionsMock: vi.fn(),
  registerMock: vi.fn(),
  requestPermissionsMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("#/auth/authClient", () => ({
  authClient: { updateUser: updateUserMock },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    addListener: addListenerMock,
    checkPermissions: checkPermissionsMock,
    register: registerMock,
    requestPermissions: requestPermissionsMock,
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => {
  checkPermissionsMock.mockResolvedValue({ receive: "granted" });
  requestPermissionsMock.mockResolvedValue({ receive: "granted" });
  registerMock.mockResolvedValue(undefined);
  updateUserMock.mockResolvedValue({ error: null });
  addListenerMock.mockResolvedValue({
    remove: vi.fn().mockResolvedValue(undefined),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("usePushNotifications", () => {
  it("registers the device token", async () => {
    const onNotificationTap = vi.fn();

    renderHook(() => usePushNotifications("user-1", onNotificationTap), {
      wrapper,
    });

    await waitFor(() => expect(registerMock).toHaveBeenCalledOnce());

    const registrationListener = addListenerMock.mock.calls.find(
      ([event]) => event === "registration",
    )?.[1] as ((event: { value: string }) => void) | undefined;
    registrationListener?.({ value: "device-token" });

    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({
        deviceToken: "device-token",
      }),
    );
  });

  it("forwards supported notification taps", async () => {
    const onNotificationTap = vi.fn();

    renderHook(() => usePushNotifications("user-1", onNotificationTap), {
      wrapper,
    });

    await waitFor(() => expect(registerMock).toHaveBeenCalledOnce());

    const actionListener = addListenerMock.mock.calls.find(
      ([event]) => event === "pushNotificationActionPerformed",
    )?.[1] as
      | ((event: {
          notification: {
            data: PushNotificationData;
          };
        }) => void)
      | undefined;

    const notifications = [
      {
        type: "friend_recommendation",
        recommendationId: "recommendation-1",
      },
      { type: "friend_request", friendshipId: "friendship-1" },
      { type: "friend_request_accepted", friendshipId: "friendship-2" },
      {
        type: "friend_recommendation_response",
        recommendationId: "recommendation-2",
      },
      { type: "media_comment", userMediaId: "media-1" },
    ] satisfies PushNotificationData[];

    for (const data of notifications) {
      actionListener?.({ notification: { data } });
    }

    expect(onNotificationTap).toHaveBeenCalledTimes(notifications.length);
    for (const data of notifications) {
      expect(onNotificationTap).toHaveBeenCalledWith(data);
    }
  });

  it("clears the token during native logout", async () => {
    await clearPushNotificationToken();

    expect(authClient.updateUser).toHaveBeenCalledWith({ deviceToken: "" });
  });
});
