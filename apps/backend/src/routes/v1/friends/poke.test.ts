import Fastify from "fastify";
import type { FastifyRequest } from "fastify";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { registerErrorHandler } from "@/error-handler";
import friendsRoutes from "./routes";

const { query, sendPush } = vi.hoisted(() => ({
  query: vi.fn(),
  sendPush: vi.fn(),
}));

vi.mock("@/db/db", async () => {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const db = drizzle.mock();
  Object.assign(db.$client, { query });
  return { db };
});

vi.mock("@/require-auth", () => ({
  requireAuth: async (request: FastifyRequest) => {
    request.userId = "sender";
  },
}));

vi.mock("@/services/pushNotifications", () => ({
  sendFriendPokeNotification: sendPush,
}));

function mockFriend({ recentPoke = false } = {}) {
  query.mockImplementation(async ({ text }: { text: string }) => {
    if (text.includes('from "friendships"')) {
      return { rows: [["Sam"]] };
    }
    if (recentPoke && text.includes('from "notifications"')) {
      return { rows: [["previous-poke"]] };
    }
    return { rows: [] };
  });
}

const app = Fastify();
registerErrorHandler(app);
app.register(friendsRoutes, { prefix: "/api/v1/friends" });

const pokeRequest = {
  method: "POST",
  url: "/api/v1/friends/recipient/poke",
} as const;

beforeEach(() => {
  query.mockReset();
  sendPush.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});
afterAll(() => app.close());

it("saves and pushes one poke per friend in 24 hours", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-06T10:00:00.000Z"));
  mockFriend();
  const first = await app.inject(pokeRequest);

  mockFriend({ recentPoke: true });
  const repeat = await app.inject(pokeRequest);

  expect(first.statusCode).toBe(201);
  expect(first.json()).toEqual({ sent: true });
  expect(repeat.statusCode).toBe(409);
  expect(sendPush).toHaveBeenCalledExactlyOnceWith("recipient", "Sam");
  expect(query).toHaveBeenCalledWith(
    expect.objectContaining({
      text: expect.stringContaining('insert into "notifications"'),
    }),
    ["recipient", "sender", "friend_poke", expect.any(String)],
  );
  expect(query).toHaveBeenCalledWith(
    expect.objectContaining({
      text: expect.stringContaining('"created_at" >'),
    }),
    expect.arrayContaining([
      "recipient",
      "sender",
      "friend_poke",
      "2026-11-05T10:00:00.000Z",
    ]),
  );
});

it("rejects a poke without an accepted friendship", async () => {
  query.mockResolvedValue({ rows: [] });

  const response = await app.inject(pokeRequest);

  expect(response.statusCode).toBe(403);
  expect(sendPush).not.toHaveBeenCalled();
});
