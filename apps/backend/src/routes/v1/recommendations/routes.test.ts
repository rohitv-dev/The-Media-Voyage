import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/errors";

const {
  createFriendRecommendationMock,
  dismissSystemRecommendationMock,
  getSystemRecommendationPreviewMock,
  requireAuthMock,
  sendFriendRecommendationNotificationMock,
  sendFriendRecommendationResponseNotificationMock,
  resolveRecommendationMock,
} = vi.hoisted(() => ({
  createFriendRecommendationMock: vi.fn(),
  dismissSystemRecommendationMock: vi.fn(),
  getSystemRecommendationPreviewMock: vi.fn(),
  requireAuthMock: vi.fn(),
  sendFriendRecommendationNotificationMock: vi.fn(),
  sendFriendRecommendationResponseNotificationMock: vi.fn(),
  resolveRecommendationMock: vi.fn(),
}));

vi.mock("@/require-auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("./system-preview", () => ({
  getSystemRecommendationPreview: getSystemRecommendationPreviewMock,
}));

vi.mock("./queries", () => ({
  dismissSystemRecommendation: dismissSystemRecommendationMock,
  getRecommendationDetail: vi.fn(),
  findFriendRecommendationSource: vi.fn(),
}));

vi.mock("./service", () => ({
  createFriendRecommendation: createFriendRecommendationMock,
  resolveRecommendation: resolveRecommendationMock,
}));

vi.mock("@/services/pushNotifications", () => ({
  sendFriendRecommendationNotification:
    sendFriendRecommendationNotificationMock,
  sendFriendRecommendationResponseNotification:
    sendFriendRecommendationResponseNotificationMock,
}));

import recommendationRoutes from "./routes";

const preview = {
  strategyKey: "provider_recommendations",
  strategyVersion: "5",
  eligibleSeedCount: 0,
  seeds: [],
  recommendations: [],
};

describe("recommendation routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    requireAuthMock.mockReset();
    requireAuthMock.mockImplementation(async (request: { userId: string }) => {
      request.userId = "user-1";
    });
    getSystemRecommendationPreviewMock.mockReset();
    getSystemRecommendationPreviewMock.mockResolvedValue(preview);
    dismissSystemRecommendationMock.mockReset();
    dismissSystemRecommendationMock.mockResolvedValue(undefined);
    createFriendRecommendationMock.mockReset();
    resolveRecommendationMock.mockReset();
    sendFriendRecommendationNotificationMock.mockReset();
    sendFriendRecommendationResponseNotificationMock.mockReset();
    sendFriendRecommendationNotificationMock.mockResolvedValue(undefined);
    sendFriendRecommendationResponseNotificationMock.mockResolvedValue(
      undefined,
    );

    app = Fastify();
    await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
    await app.register(recommendationRoutes, {
      prefix: "/api/v1/recommendations",
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("sends a push after resolving a friend recommendation", async () => {
    const recommendationId = "123e4567-e89b-12d3-a456-426614174001";
    const responseBody = {
      id: recommendationId,
      status: "resolved",
      outcome: "added_to_library",
      recipientUserMediaId: null,
      recipientUserMediaCreated: false,
    };
    resolveRecommendationMock.mockResolvedValue({
      response: responseBody,
      recipientId: "sender-1",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/recommendations/${recommendationId}/resolve`,
      payload: { outcome: "added_to_library" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(responseBody);
    expect(
      sendFriendRecommendationResponseNotificationMock,
    ).toHaveBeenCalledWith("sender-1", recommendationId, "added_to_library");
  });

  it("sends a push after creating a friend recommendation", async () => {
    createFriendRecommendationMock.mockResolvedValue({
      id: "recommendation-1",
      status: "pending",
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/recommendations",
      payload: {
        recipientId: "friend-1",
        sourceUserMediaId: "123e4567-e89b-12d3-a456-426614174000",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(sendFriendRecommendationNotificationMock).toHaveBeenCalledWith(
      "friend-1",
      "recommendation-1",
    );
  });

  it("registers the static authenticated route with no-store caching", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recommendations/system/preview",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual(preview);
    expect(getSystemRecommendationPreviewMock).toHaveBeenCalledWith("user-1");
  });

  it("rejects unauthenticated preview requests", async () => {
    requireAuthMock.mockRejectedValueOnce(unauthorized());

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/recommendations/system/preview",
    });

    expect(response.statusCode).toBe(401);
    expect(getSystemRecommendationPreviewMock).not.toHaveBeenCalled();
  });

  it("persists an authenticated system recommendation dismissal", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/recommendations/system/dismiss",
      payload: { source: "tmdb_movie", externalId: "550" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ success: true });
    expect(dismissSystemRecommendationMock).toHaveBeenCalledWith(
      "user-1",
      "tmdb_movie",
      "550",
    );
  });

  it("limits preview generation to five requests per minute", async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/recommendations/system/preview",
      });
      expect(response.statusCode).toBe(200);
    }

    const limited = await app.inject({
      method: "GET",
      url: "/api/v1/recommendations/system/preview",
    });
    expect(limited.statusCode).toBe(429);
  });
});
