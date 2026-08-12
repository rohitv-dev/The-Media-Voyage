import { beforeEach, describe, expect, it, vi } from "vitest";
import { media, userMedia } from "@media-voyage/shared";

const { transactionMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: {
    transaction: transactionMock,
  },
}));

import {
  friendMediaDetailedSelect,
  friendMediaSummarySelect,
} from "../friends/selects";
import {
  publicMediaDetailSelect,
  publicMediaSummarySelect,
} from "../public/selects";
import {
  userMediaDetailedSelect,
  userMediaSummarySelect,
} from "./selects";
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
    expect(userMediaSummarySelect.imageFocusX).toBe(userMedia.imageFocusX);
    expect(userMediaSummarySelect.imageFocusY).toBe(userMedia.imageFocusY);
    expect(userMediaDetailedSelect.imageFocusX).toBe(userMedia.imageFocusX);
    expect(userMediaDetailedSelect.imageFocusY).toBe(userMedia.imageFocusY);

    const friendSummary = friendMediaSummarySelect("viewer-1");
    expect(friendSummary.imageFocusX).toBe(userMedia.imageFocusX);
    expect(friendSummary.imageFocusY).toBe(userMedia.imageFocusY);
    expect(friendMediaDetailedSelect.imageFocusX).toBe(userMedia.imageFocusX);
    expect(friendMediaDetailedSelect.imageFocusY).toBe(userMedia.imageFocusY);
    expect(publicMediaSummarySelect.imageFocusX).toBe(userMedia.imageFocusX);
    expect(publicMediaSummarySelect.imageFocusY).toBe(userMedia.imageFocusY);
    expect(publicMediaDetailSelect.imageFocusX).toBe(userMedia.imageFocusX);
    expect(publicMediaDetailSelect.imageFocusY).toBe(userMedia.imageFocusY);
  });

  it("updates only the owned user-media row", async () => {
    const updatedRecord = {
      id: ENTRY_ID,
      imageFocusX: 0.25,
      imageFocusY: 0.75,
    };
    const lockedEntry = createSelectBuilder([{ id: ENTRY_ID }]);
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

    expect(tx.update).toHaveBeenCalledWith(userMedia);
    expect(tx.update).not.toHaveBeenCalledWith(media);
    expect(updateBuilder.set).toHaveBeenCalledWith({
      imageFocusX: 0.25,
      imageFocusY: 0.75,
    });
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
