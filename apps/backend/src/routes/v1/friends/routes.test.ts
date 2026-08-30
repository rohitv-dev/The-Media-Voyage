import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/errors";

const {
  addCommentMock,
  requireAuthMock,
  respondToFriendRequestMock,
  sendFriendRequestMock,
  sendFriendRequestAcceptedNotificationMock,
  sendFriendRequestNotificationMock,
  sendMediaCommentNotificationMock,
} = vi.hoisted(() => ({
  addCommentMock: vi.fn(),
  requireAuthMock: vi.fn(),
  respondToFriendRequestMock: vi.fn(),
  sendFriendRequestMock: vi.fn(),
  sendFriendRequestAcceptedNotificationMock: vi.fn(),
  sendFriendRequestNotificationMock: vi.fn(),
  sendMediaCommentNotificationMock: vi.fn(),
}));

vi.mock("@/require-auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("@/services/pushNotifications", () => ({
  sendFriendRequestAcceptedNotification:
    sendFriendRequestAcceptedNotificationMock,
  sendFriendRequestNotification: sendFriendRequestNotificationMock,
  sendMediaCommentNotification: sendMediaCommentNotificationMock,
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
  addComment: addCommentMock,
  deleteComment: vi.fn(),
  removeFriendship: vi.fn(),
  respondToFriendRequest: respondToFriendRequestMock,
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
    addCommentMock.mockReset();
    sendFriendRequestMock.mockReset();
    respondToFriendRequestMock.mockReset();
    sendFriendRequestAcceptedNotificationMock.mockReset();
    sendFriendRequestNotificationMock.mockReset();
    sendMediaCommentNotificationMock.mockReset();
    sendFriendRequestAcceptedNotificationMock.mockResolvedValue(undefined);
    sendFriendRequestNotificationMock.mockResolvedValue(undefined);
    sendMediaCommentNotificationMock.mockResolvedValue(undefined);
  });

  it("sends a push after creating a pending friend request", async () => {
    sendFriendRequestMock.mockResolvedValue({
      friendship: {
        id: "friendship-1",
        requesterId: "user-1",
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
        requesterId: "user-3",
        addresseeId: "user-1",
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
      expect(sendFriendRequestAcceptedNotificationMock).toHaveBeenCalledWith(
        "user-3",
        "friendship-1",
      );
    } finally {
      await app.close();
    }
  });

  it("sends a push when a friend request is accepted", async () => {
    const friendshipId = "123e4567-e89b-12d3-a456-426614174001";
    respondToFriendRequestMock.mockResolvedValue({
      id: friendshipId,
      requesterId: "user-2",
      addresseeId: "user-1",
      status: "accepted",
    });
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/friends/requests/${friendshipId}`,
        payload: { action: "accept" },
      });

      expect(response.statusCode).toBe(200);
      expect(sendFriendRequestAcceptedNotificationMock).toHaveBeenCalledWith(
        "user-2",
        friendshipId,
      );
    } finally {
      await app.close();
    }
  });

  it("sends a push after adding a comment to a friend's media", async () => {
    const userMediaId = "123e4567-e89b-12d3-a456-426614174002";
    addCommentMock.mockResolvedValue({
      comment: {
        id: "123e4567-e89b-12d3-a456-426614174003",
        userMediaId,
        userId: "user-1",
        body: "Great pick",
        createdAt: new Date(),
      },
      recipientId: "user-2",
    });
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/friends/media/${userMediaId}/comments`,
        payload: { body: "Great pick" },
      });

      expect(response.statusCode).toBe(201);
      expect(sendMediaCommentNotificationMock).toHaveBeenCalledWith(
        "user-2",
        userMediaId,
      );
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
