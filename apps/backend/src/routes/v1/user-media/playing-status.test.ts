import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  userMediaPatchSchema,
  userMediaQuickActionSchema,
} from "@media-voyage/shared/api";

const { transactionMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: { transaction: transactionMock },
}));

import { updateUserMedia, updateUserMediaQuickActions } from "./service";

const USER_ID = "user-1";
const ENTRY_ID = "22222222-2222-4222-8222-222222222222";

function createSelectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };

  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.for.mockReturnValue(builder);
  return builder;
}

function createTransaction(type: "movie" | "game") {
  const selectResults = [
    [
      {
        status: "planned",
        progress: 0,
        type,
        startedAt: null,
        lastProgressUpdate: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    [{ id: ENTRY_ID, status: "playing", progress: 0 }],
  ];
  const updateBuilder = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi
      .fn()
      .mockResolvedValue([{ id: ENTRY_ID, status: "playing", progress: 0 }]),
  };
  const historyInsert = { values: vi.fn().mockResolvedValue([]) };
  updateBuilder.set.mockReturnValue(updateBuilder);
  updateBuilder.where.mockReturnValue(updateBuilder);

  const tx = {
    select: vi.fn(() => createSelectBuilder(selectResults.shift() ?? [])),
    update: vi.fn(() => updateBuilder),
    insert: vi.fn(() => historyInsert),
  };

  transactionMock.mockImplementation((callback) => callback(tx));
  return { tx, updateBuilder };
}

describe("Playing status backend guard", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("rejects Playing for a non-game normal edit", async () => {
    const { tx } = createTransaction("movie");

    await expect(
      updateUserMedia(
        USER_ID,
        ENTRY_ID,
        userMediaPatchSchema.parse({ status: "playing" }),
      ),
    ).rejects.toThrow("Playing status is only available for games");

    expect(tx.update).not.toHaveBeenCalled();
  });

  it("rejects Playing for a non-game quick action", async () => {
    const { tx } = createTransaction("movie");

    await expect(
      updateUserMediaQuickActions(
        USER_ID,
        ENTRY_ID,
        userMediaQuickActionSchema.parse({ status: "playing" }),
      ),
    ).rejects.toThrow("Playing status is only available for games");

    expect(tx.update).not.toHaveBeenCalled();
  });

  it("accepts Playing for a game normal edit", async () => {
    const { updateBuilder } = createTransaction("game");

    await updateUserMedia(
      USER_ID,
      ENTRY_ID,
      userMediaPatchSchema.parse({ status: "playing" }),
    );

    expect(updateBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "playing" }),
    );
  });

  it("accepts Playing for a game quick action", async () => {
    const { updateBuilder } = createTransaction("game");

    await updateUserMediaQuickActions(
      USER_ID,
      ENTRY_ID,
      userMediaQuickActionSchema.parse({ status: "playing" }),
    );

    expect(updateBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "playing" }),
    );
  });
});
