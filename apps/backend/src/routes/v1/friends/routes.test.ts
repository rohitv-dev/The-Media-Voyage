import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/errors";

const {
  requireAuthMock,
  sendFriendRequestMock,
  sendFriendRequestNotificationMock,
} = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  sendFriendRequestMock: vi.fn(),
  sendFriendRequestNotificationMock: vi.fn(),
}));

vi.mock("@/require-auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/services/pushNotifications", () => ({
  sendFriendRequestNotification: sendFriendRequestNotificationMock,
}));

vi.mock("./queries", () => ({
  getFriendCollection: vi.fn(),
  getFriendsFeed: vi.fn(),
  getViewableUserMediaDetail: vi.fn(),
  listComments: vi.fn(),
  listFriendCollections: vi.fn(),
  listFriendMedia: vi.fn(),
  listFriendRequests: vi.fn(),
  listFriends: vi.fn(),
}));

vi.mock("./service", () => ({
  addComment: vi.fn(),
  deleteComment: vi.fn(),
  removeFriendship: vi.fn(),
  respondToFriendRequest: vi.fn(),
  sendFriendRequest: sendFriendRequestMock,
  setReaction: vi.fn(),
  shareLibrary: vi.fn(),
}));

import friendsRoutes from "./routes";

async function buildApp() {
  const app = Fastify();
  await app.register(friendsRoutes, { prefix: "/api/v1/friends" });
  return app;
}

describe("friend routes", () => {
  beforeEach(() => {
    requireAuthMock.mockReset();
    requireAuthMock.mockImplementation(async (request: { userId: string }) => {
      request.userId = "user-1";
    });
    sendFriendRequestMock.mockReset();
    sendFriendRequestNotificationMock.mockReset();
    sendFriendRequestNotificationMock.mockResolvedValue(undefined);
  });

  it("sends a push after creating a pending friend request", async () => {
    sendFriendRequestMock.mockResolvedValue({
      friendship: {
        id: "friendship-1",
        addresseeId: "user-2",
      },
      autoAccepted: false,
    });
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/friends/requests",
        payload: { email: "friend@example.com" },
      });

      expect(response.statusCode).toBe(201);
      expect(sendFriendRequestMock).toHaveBeenCalledWith(
        "user-1",
        "friend@example.com",
      );
      expect(sendFriendRequestNotificationMock).toHaveBeenCalledWith(
        "user-2",
        "friendship-1",
      );
    } finally {
      await app.close();
    }
  });

  it("does not send a pending-request push when an existing request is auto-accepted", async () => {
    sendFriendRequestMock.mockResolvedValue({
      friendship: {
        id: "friendship-1",
        addresseeId: "user-2",
      },
      autoAccepted: true,
    });
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/friends/requests",
        payload: { email: "friend@example.com" },
      });

      expect(response.statusCode).toBe(201);
      expect(sendFriendRequestNotificationMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("rejects unauthenticated requests", async () => {
    requireAuthMock.mockRejectedValueOnce(unauthorized());
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/friends/requests",
        payload: { email: "friend@example.com" },
      });

      expect(response.statusCode).toBe(401);
      expect(sendFriendRequestMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
