import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { unauthorized } from "@/errors";

const { getSystemRecommendationPreviewMock, requireAuthMock } = vi.hoisted(
  () => ({
    getSystemRecommendationPreviewMock: vi.fn(),
    requireAuthMock: vi.fn(),
  }),
);

vi.mock("@/require-auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("./system-preview", () => ({
  getSystemRecommendationPreview: getSystemRecommendationPreviewMock,
}));

vi.mock("./queries", () => ({
  getRecommendationDetail: vi.fn(),
  findFriendRecommendationSource: vi.fn(),
}));

vi.mock("./service", () => ({
  createFriendRecommendation: vi.fn(),
  resolveRecommendation: vi.fn(),
}));

import recommendationRoutes from "./routes";

const preview = {
  strategyKey: "provider_recommendations",
  strategyVersion: "1",
  eligibleSeedCount: 0,
  seeds: [],
  recommendations: [],
};

async function buildApp() {
  const app = Fastify();
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(recommendationRoutes, {
    prefix: "/api/v1/recommendations",
  });
  return app;
}

describe("system recommendation preview route", () => {
  beforeEach(() => {
    requireAuthMock.mockReset();
    requireAuthMock.mockImplementation(async (request: { userId: string }) => {
      request.userId = "user-1";
    });
    getSystemRecommendationPreviewMock.mockReset();
    getSystemRecommendationPreviewMock.mockResolvedValue(preview);
  });

  it("registers the static authenticated route with no-store caching", async () => {
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/recommendations/system/preview",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json()).toEqual(preview);
      expect(getSystemRecommendationPreviewMock).toHaveBeenCalledWith("user-1");
    } finally {
      await app.close();
    }
  });

  it("rejects unauthenticated preview requests", async () => {
    requireAuthMock.mockRejectedValueOnce(unauthorized());
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/recommendations/system/preview",
      });

      expect(response.statusCode).toBe(401);
      expect(getSystemRecommendationPreviewMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("limits preview generation to five requests per minute", async () => {
    const app = await buildApp();

    try {
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
    } finally {
      await app.close();
    }
  });
});
