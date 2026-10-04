import { mediaCollectionItems } from "@media-voyage/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireOwnedCollectionMock, transactionMock } = vi.hoisted(() => ({
  requireOwnedCollectionMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock("../collection/queries", () => ({
  requireOwnedCollection: requireOwnedCollectionMock,
}));

vi.mock("./queries", () => ({
  listCollectionItems: vi.fn(),
  listCollectionItemsDetailed: vi.fn(),
}));

import { addCollectionItem, addCollectionItems } from "./service";

const USER_ID = "user-1";
const COLLECTION_ID = "11111111-1111-4111-8111-111111111111";
const FIRST_MEDIA_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_MEDIA_ID = "33333333-3333-4333-8333-333333333333";

const firstItem = {
  id: "44444444-4444-4444-8444-444444444444",
  collectionId: COLLECTION_ID,
  userMediaId: FIRST_MEDIA_ID,
  position: 5,
};
const secondItem = {
  id: "55555555-5555-4555-8555-555555555555",
  collectionId: COLLECTION_ID,
  userMediaId: SECOND_MEDIA_ID,
  position: 6,
};

function createSelectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    then: (
      onFulfilled?: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
  };

  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.for.mockReturnValue(builder);
  return builder;
}

function createInsertBuilder(result: unknown[]) {
  const builder = {
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };

  builder.values.mockReturnValue(builder);
  return builder;
}

function configureTransaction({
  collection = [{ id: COLLECTION_ID }],
  ownedMedia = [{ id: FIRST_MEDIA_ID }],
  existingItems = [],
  lastPosition = 4,
  inserted = [firstItem],
}: {
  collection?: unknown[];
  ownedMedia?: unknown[];
  existingItems?: unknown[];
  lastPosition?: number;
  inserted?: unknown[];
} = {}) {
  const collectionSelect = createSelectBuilder(collection);
  const selectBuilders = [
    collectionSelect,
    createSelectBuilder(ownedMedia),
    createSelectBuilder(existingItems),
    createSelectBuilder([{ position: lastPosition }]),
  ];
  const insertBuilder = createInsertBuilder(inserted);
  const tx = {
    select: vi.fn(() => selectBuilders.shift() ?? createSelectBuilder([])),
    insert: vi.fn().mockReturnValue(insertBuilder),
  };

  transactionMock.mockImplementation((callback) => callback(tx));
  return { collectionSelect, insertBuilder, tx };
}

describe("collection-item insertion", () => {
  beforeEach(() => {
    requireOwnedCollectionMock.mockReset();
    transactionMock.mockReset();
  });

  it("uses the batch transaction for a single insertion", async () => {
    const { collectionSelect, insertBuilder, tx } = configureTransaction();

    await expect(
      addCollectionItem(USER_ID, COLLECTION_ID, FIRST_MEDIA_ID),
    ).resolves.toEqual(firstItem);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(collectionSelect.for).toHaveBeenCalledWith("update");
    expect(insertBuilder.values).toHaveBeenCalledWith([
      {
        collectionId: COLLECTION_ID,
        userMediaId: FIRST_MEDIA_ID,
        position: 5,
      },
    ]);
    expect(tx.insert).toHaveBeenCalledWith(mediaCollectionItems);
  });

  it("preserves input order and positions for batch insertion", async () => {
    const ids = [SECOND_MEDIA_ID, FIRST_MEDIA_ID];
    const rows = [
      { ...secondItem, position: 8 },
      { ...firstItem, position: 9 },
    ];
    const { insertBuilder } = configureTransaction({
      ownedMedia: ids.map((id) => ({ id })),
      lastPosition: 7,
      inserted: rows,
    });

    await expect(
      addCollectionItems(USER_ID, COLLECTION_ID, ids),
    ).resolves.toEqual(rows);

    expect(insertBuilder.values).toHaveBeenCalledWith([
      {
        collectionId: COLLECTION_ID,
        userMediaId: SECOND_MEDIA_ID,
        position: 8,
      },
      {
        collectionId: COLLECTION_ID,
        userMediaId: FIRST_MEDIA_ID,
        position: 9,
      },
    ]);
  });

  it("rejects a missing media entry without inserting", async () => {
    const { tx } = configureTransaction({ ownedMedia: [] });

    await expect(
      addCollectionItem(USER_ID, COLLECTION_ID, FIRST_MEDIA_ID),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Selected media entry not found",
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("rejects an unavailable collection before media validation", async () => {
    const { tx } = configureTransaction({ collection: [] });

    await expect(
      addCollectionItems(USER_ID, COLLECTION_ID, [FIRST_MEDIA_ID]),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Collection not found",
    });

    expect(tx.select).toHaveBeenCalledTimes(1);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("rejects an existing collection item without inserting", async () => {
    const { tx } = configureTransaction({ existingItems: [{ id: "item-1" }] });

    await expect(
      addCollectionItem(USER_ID, COLLECTION_ID, FIRST_MEDIA_ID),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "CONFLICT",
      message: "Media is already in this collection",
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it("propagates transaction failures unchanged", async () => {
    const error = new Error("database unavailable");
    transactionMock.mockRejectedValue(error);

    await expect(
      addCollectionItems(USER_ID, COLLECTION_ID, [FIRST_MEDIA_ID]),
    ).rejects.toBe(error);
  });
});
