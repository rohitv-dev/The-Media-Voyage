import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerErrorHandler } from "@/error-handler";
import { unauthorized } from "@/errors";

const {
  addCollectionItemMock,
  addCollectionItemsMock,
  requireAuthMock,
} = vi.hoisted(() => ({
  addCollectionItemMock: vi.fn(),
  addCollectionItemsMock: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@/require-auth", () => ({
  requireAuth: requireAuthMock,
}));

vi.mock("./service", () => ({
  addCollectionItem: addCollectionItemMock,
  addCollectionItems: addCollectionItemsMock,
  getOwnedCollectionItems: vi.fn(),
  getOwnedCollectionItemsDetailed: vi.fn(),
  removeCollectionItem: vi.fn(),
  reorderCollectionItems: vi.fn(),
}));

import collectionItemRoutes from "./routes";

const COLLECTION_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_MEDIA_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_MEDIA_ID = "33333333-3333-4333-8333-333333333333";

async function buildApp() {
  const app = Fastify();
  registerErrorHandler(app);
  await app.register(collectionItemRoutes, {
    prefix: "/api/v1/collectionItem",
  });
  return app;
}

describe("collection-item routes", () => {
  beforeEach(() => {
    addCollectionItemMock.mockReset();
    addCollectionItemsMock.mockReset();
    requireAuthMock.mockReset();
    requireAuthMock.mockImplementation(async (request: { userId: string }) => {
      request.userId = "user-1";
    });
  });

  it("authenticates requests before calling insertion services", async () => {
    requireAuthMock.mockRejectedValueOnce(unauthorized());
    const app = await buildApp();

    try {
      const response = await app.inject({
        method: "POST",
        url: `/api/v1/collectionItem/${COLLECTION_ID}`,
        payload: { userMediaId: FIRST_MEDIA_ID },
      });

      expect(response.statusCode).toBe(401);
      expect(addCollectionItemMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("returns one object for a single insertion and an array for a batch", async () => {
    const single = { id: "item-1", userMediaId: FIRST_MEDIA_ID };
    const batch = [
      { id: "item-1", userMediaId: FIRST_MEDIA_ID },
      { id: "item-2", userMediaId: SECOND_MEDIA_ID },
    ];
    addCollectionItemMock.mockResolvedValue(single);
    addCollectionItemsMock.mockResolvedValue(batch);
    const app = await buildApp();

    try {
      const singleResponse = await app.inject({
        method: "POST",
        url: `/api/v1/collectionItem/${COLLECTION_ID}`,
        payload: { userMediaId: FIRST_MEDIA_ID },
      });
      const batchResponse = await app.inject({
        method: "POST",
        url: `/api/v1/collectionItem/${COLLECTION_ID}/batch`,
        payload: { userMediaIds: [FIRST_MEDIA_ID, SECOND_MEDIA_ID] },
      });

      expect(singleResponse.statusCode).toBe(201);
      expect(singleResponse.json()).toEqual(single);
      expect(batchResponse.statusCode).toBe(201);
      expect(batchResponse.json()).toEqual(batch);
      expect(addCollectionItemMock).toHaveBeenCalledWith(
        "user-1",
        COLLECTION_ID,
        FIRST_MEDIA_ID,
      );
      expect(addCollectionItemsMock).toHaveBeenCalledWith(
        "user-1",
        COLLECTION_ID,
        [FIRST_MEDIA_ID, SECOND_MEDIA_ID],
      );
    } finally {
      await app.close();
    }
  });

  it("rejects empty and duplicate batch selections", async () => {
    const app = await buildApp();

    try {
      const empty = await app.inject({
        method: "POST",
        url: `/api/v1/collectionItem/${COLLECTION_ID}/batch`,
        payload: { userMediaIds: [] },
      });
      const duplicate = await app.inject({
        method: "POST",
        url: `/api/v1/collectionItem/${COLLECTION_ID}/batch`,
        payload: { userMediaIds: [FIRST_MEDIA_ID, FIRST_MEDIA_ID] },
      });

      expect(empty.statusCode).toBe(400);
      expect(duplicate.statusCode).toBe(400);
      expect(addCollectionItemsMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
