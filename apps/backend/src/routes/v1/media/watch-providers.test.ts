import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerErrorHandler } from "@/error-handler";
import { unauthorized } from "@/errors";

const { getProviders, getRegions, requireAuth } = vi.hoisted(() => ({
  getProviders: vi.fn(),
  getRegions: vi.fn(),
  requireAuth: vi.fn(),
}));
vi.mock("@/require-auth", () => ({ requireAuth }));
vi.mock("@/services/tmdb", () => ({
  getTmdbDetails: vi.fn(),
  getTmdbWatchProviders: getProviders,
  getTmdbWatchRegions: getRegions,
}));
vi.mock("@/services/providerCatalog", () => ({
  resolveProviderMediaSelection: vi.fn(),
}));
vi.mock("./service", () => ({ searchMedia: vi.fn() }));

import mediaRoutes from "./routes";

let app: FastifyInstance;

beforeEach(async () => {
  vi.resetAllMocks();
  requireAuth.mockResolvedValue(undefined);
  getProviders.mockResolvedValue({ country: "IN", link: null, offers: {} });
  getRegions.mockResolvedValue([{ code: "IN", name: "India" }]);
  app = Fastify();
  registerErrorHandler(app);
  await app.register(mediaRoutes, { prefix: "/api/v1/media" });
});

afterEach(async () => {
  await app.close();
});

describe("watch-provider routes", () => {
  it("passes validated TMDB identity and country to the provider service", async () => {
    const result = await app.inject(
      "/api/v1/media/tmdb/show/101/watch/providers?country=IN",
    );
    expect(result.statusCode).toBe(200);
    expect(getProviders).toHaveBeenCalledWith("show", 101, "IN");
  });

  it("rejects an invalid country before calling TMDB", async () => {
    const result = await app.inject(
      "/api/v1/media/tmdb/movie/101/watch/providers?country=in",
    );
    expect(result.statusCode).toBe(400);
    expect(result.json().code).toBe("VALIDATION_ERROR");
    expect(getProviders).not.toHaveBeenCalled();
  });

  it("requires a signed-in viewer", async () => {
    requireAuth.mockRejectedValue(unauthorized());
    const result = await app.inject(
      "/api/v1/media/tmdb/movie/101/watch/providers?country=IN",
    );
    expect(result.statusCode).toBe(401);
    expect(getProviders).not.toHaveBeenCalled();
    expect(getRegions).not.toHaveBeenCalled();
  });
});
