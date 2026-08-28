import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbSelectMock, searchGamesMock, searchOpenLibraryMock, searchTmdbMock } =
  vi.hoisted(() => ({
    dbSelectMock: vi.fn(),
    searchGamesMock: vi.fn(),
    searchOpenLibraryMock: vi.fn(),
    searchTmdbMock: vi.fn(),
  }));

vi.mock("@/db/db", () => ({ db: { select: dbSelectMock } }));
vi.mock("@/services/igdb", () => ({ searchGames: searchGamesMock }));
vi.mock("@/services/openLibrary", () => ({
  searchOpenLibrary: searchOpenLibraryMock,
}));
vi.mock("@/services/tmdb", () => ({ searchTmdb: searchTmdbMock }));

import { searchMedia } from "./service";

describe("media search", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    searchGamesMock.mockReset();
    searchOpenLibraryMock.mockReset();
    searchTmdbMock.mockReset();
    searchTmdbMock.mockResolvedValue([]);
  });

  it("preserves the provider identity for a local TMDB show", async () => {
    dbSelectMock.mockReturnValue(
      {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: "media-1",
            title: "Example Show",
            imageUrl: null,
            type: "show",
            externalId: "100",
            source: "tmdb_tv",
          },
        ]),
      },
    );

    await expect(searchMedia({ q: "Example", type: "show" })).resolves.toEqual([
      {
        id: "media-1",
        source: "tmdb_tv",
        title: "Example Show",
        imageUrl: null,
        type: "show",
        externalId: "100",
      },
    ]);
  });
});
