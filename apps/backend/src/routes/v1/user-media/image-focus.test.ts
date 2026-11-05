import { beforeEach, describe, expect, it, vi } from "vitest";
import { userMedia } from "@media-voyage/shared";
import { PgDialect } from "drizzle-orm/pg-core";

const { transactionMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: {
    transaction: transactionMock,
  },
}));

vi.mock("@/services/providerCatalog", () => ({
  ensureProviderCatalogMedia: vi.fn(),
}));

import {
  friendMediaDetailedSelect,
  friendMediaSummarySelect,
} from "../friends/selects";
import {
  publicMediaDetailSelect,
  publicMediaSummarySelect,
} from "../public/selects";
import { userMediaDetailedSelect, userMediaSummarySelect } from "./selects";
import { updateUserMediaImageFocus } from "./service";

const USER_ID = "user-1";
const ENTRY_ID = "11111111-1111-4111-8111-111111111111";

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

describe("user-media image focus", () => {
  beforeEach(() => {
    transactionMock.mockReset();
  });

  it("selects the focus stored on the entry in owner, friend, and public views", () => {
    for (const selection of [
      userMediaSummarySelect,
      userMediaDetailedSelect,
      friendMediaSummarySelect("viewer-1"),
      friendMediaDetailedSelect,
      publicMediaSummarySelect,
      publicMediaDetailSelect,
    ]) {
      expect(selection.imageFocusX).toBe(userMedia.imageFocusX);
      expect(selection.imageFocusY).toBe(userMedia.imageFocusY);
    }
  });

  it("updates only the owned user-media row", async () => {
    const updatedAt = new Date("2026-08-19T00:00:00.000Z");
    const updatedRecord = {
      id: ENTRY_ID,
      imageFocusX: 0.25,
      imageFocusY: 0.75,
    };
    const lockedEntry = createSelectBuilder([{ id: ENTRY_ID, updatedAt }]);
    const returnedEntry = createSelectBuilder([updatedRecord]);
    const updateBuilder = {
      set: vi.fn(),
      where: vi.fn().mockResolvedValue([]),
    };
    updateBuilder.set.mockReturnValue(updateBuilder);

    const tx = {
      select: vi
        .fn()
        .mockReturnValueOnce(lockedEntry)
        .mockReturnValueOnce(returnedEntry),
      update: vi.fn().mockReturnValue(updateBuilder),
    };
    transactionMock.mockImplementation((callback) => callback(tx));

    await expect(
      updateUserMediaImageFocus(USER_ID, ENTRY_ID, {
        imageFocusX: 0.25,
        imageFocusY: 0.75,
      }),
    ).resolves.toEqual(updatedRecord);

    expect(tx.update).toHaveBeenCalledExactlyOnceWith(userMedia);
    expect(updateBuilder.set).toHaveBeenCalledWith({
      imageFocusX: 0.25,
      imageFocusY: 0.75,
      updatedAt,
    });

    const dialect = new PgDialect();
    for (const { where } of [lockedEntry, updateBuilder, returnedEntry]) {
      const { sql, params } = dialect.sqlToQuery(where.mock.calls[0][0]);
      expect(sql).toContain('"user_media"."id" =');
      expect(sql).toContain('"user_media"."user_id" =');
      expect(sql).toContain('"user_media"."deleted_at" is null');
      expect(params).toEqual(expect.arrayContaining([ENTRY_ID, USER_ID]));
    }
  });

  it("does not update anything when the entry is not owned", async () => {
    const lockedEntry = createSelectBuilder([]);
    const tx = {
      select: vi.fn().mockReturnValue(lockedEntry),
      update: vi.fn(),
    };
    transactionMock.mockImplementation((callback) => callback(tx));

    await expect(
      updateUserMediaImageFocus(USER_ID, ENTRY_ID, {
        imageFocusX: null,
        imageFocusY: null,
      }),
    ).resolves.toBeNull();

    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.select).toHaveBeenCalledTimes(1);
  });
});
