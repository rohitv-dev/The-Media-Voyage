import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { registerErrorHandler } from "@/error-handler";
import { unauthorized } from "@/errors";

const { filterPage, getSimilar, requireAuth } = vi.hoisted(() => ({
  filterPage: vi.fn(),
  getSimilar: vi.fn(),
  requireAuth: vi.fn(),
}));
vi.mock("@/require-auth", () => ({ requireAuth }));
vi.mock("@/services/mediaEmbeddings", () => ({}));
vi.mock("./service", () => ({}));
vi.mock("./queries", () => ({
  filterUserMediaPage: filterPage,
  getSimilarLibraryMedia: getSimilar,
}));

import userMediaRoutes from "./routes";

const id = "11111111-1111-4111-8111-111111111111";
let app: FastifyInstance;

beforeEach(async () => {
  vi.resetAllMocks();
  requireAuth.mockImplementation(async (request) => {
    request.userId = "owner-1";
  });
  getSimilar.mockResolvedValue([]);
  app = Fastify();
  registerErrorHandler(app);
  await app.register(userMediaRoutes, { prefix: "/user-media" });
});

afterEach(async () => {
  await app.close();
});

it("uses the authenticated owner and validates the source entry id", async () => {
  const response = await app.inject(
    `/user-media/${id}/similar?userId=other-user`,
  );
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(getSimilar).toHaveBeenCalledWith("owner-1", id);

  const invalid = await app.inject("/user-media/invalid/similar");
  expect(invalid.statusCode).toBe(400);
  expect(getSimilar).toHaveBeenCalledTimes(1);
});

it("requires authentication before querying library matches", async () => {
  requireAuth.mockRejectedValue(unauthorized());
  const response = await app.inject(`/user-media/${id}/similar`);
  expect(response.statusCode).toBe(401);
  expect(getSimilar).not.toHaveBeenCalled();
});

it.each(["not-json", '["unknown-status"]'])(
  "rejects the invalid library status filter %s before querying",
  async (status) => {
    const response = await app.inject(
      `/user-media/filter/page?${new URLSearchParams({ status })}`,
    );

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      type: "validation",
      code: "VALIDATION_ERROR",
    });
    expect(filterPage).not.toHaveBeenCalled();
  },
);
