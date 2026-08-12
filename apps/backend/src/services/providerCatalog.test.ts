import { beforeEach, describe, expect, it, vi } from "vitest";
import { internalServerError } from "@/errors";

const {
  dbSelectMock,
  getGameCatalogRecordMock,
  getOpenLibraryCatalogRecordMock,
  getTmdbDetailsMock,
  transactionMock,
} = vi.hoisted(() => ({
  dbSelectMock: vi.fn(),
  getGameCatalogRecordMock: vi.fn(),
  getOpenLibraryCatalogRecordMock: vi.fn(),
  getTmdbDetailsMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: {
    select: dbSelectMock,
    transaction: transactionMock,
  },
}));
vi.mock("./igdb", () => ({
  getGameCatalogRecord: getGameCatalogRecordMock,
}));
vi.mock("./openLibrary", () => ({
  getOpenLibraryCatalogRecord: getOpenLibraryCatalogRecordMock,
}));
vi.mock("./tmdb", () => ({ getTmdbDetails: getTmdbDetailsMock }));

import {
  ensureProviderCatalogMedia,
  fetchProviderCatalogMedia,
  resolveProviderMediaSelection,
} from "./providerCatalog";

function createSelectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };

  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

describe("provider catalog resolution", () => {
  beforeEach(() => {
    dbSelectMock.mockReset();
    getGameCatalogRecordMock.mockReset();
    getOpenLibraryCatalogRecordMock.mockReset();
    getTmdbDetailsMock.mockReset();
    transactionMock.mockReset();
  });

  it("maps TMDB's canonical fields instead of client values", async () => {
    getTmdbDetailsMock.mockResolvedValue({
      id: "",
      source: "tmdb_movie",
      externalId: "438631",
      title: "Dune",
      type: "movie",
      imageUrl: "https://image.test/dune.jpg",
      description: "A desert epic.",
      genres: ["Adventure"],
      keywords: ["politics"],
      runtimeMinutes: 155,
      catalogRating: 8,
      seasons: [],
    });

    await expect(
      fetchProviderCatalogMedia({
        source: "tmdb_movie",
        externalId: "438631",
      }),
    ).resolves.toEqual({
      title: "Dune",
      type: "movie",
      imageUrl: "https://image.test/dune.jpg",
      description: "A desert epic.",
      metadata: {
        genre: ["Adventure"],
        keywords: ["politics"],
        runtime: 155,
        catalogRating: 8,
      },
      source: "tmdb_movie",
      externalId: "438631",
    });
  });

  it("maps IGDB and Open Library records through the existing metadata rules", async () => {
    getGameCatalogRecordMock.mockResolvedValue({
      record: {
        title: "Game",
        imageUrl: "https://image.test/game.jpg",
      },
      details: {
        id: 100,
        name: "Game",
        summary: "An adventure.",
        genres: [{ id: 1, name: "RPG" }],
        rating: 89.4,
      },
    });
    getOpenLibraryCatalogRecordMock.mockResolvedValue({
      record: {
        title: "Book",
        imageUrl: "https://image.test/book.jpg",
        externalId: "OL123W",
      },
      details: {
        description: "A book.",
        genres: ["Fantasy"],
        subjects: ["Fantasy", "Magic"],
        numberOfPages: 412,
      },
    });

    await expect(
      fetchProviderCatalogMedia({ source: "igdb", externalId: "100" }),
    ).resolves.toMatchObject({
      title: "Game",
      type: "game",
      metadata: { genre: ["RPG"], catalogRating: 8.9 },
    });
    await expect(
      fetchProviderCatalogMedia({
        source: "open_library",
        externalId: "OL123W",
      }),
    ).resolves.toMatchObject({
      title: "Book",
      type: "book",
      description: "A book.",
      metadata: {
        genre: ["Fantasy"],
        subjects: ["Fantasy", "Magic"],
        numberOfPages: 412,
      },
    });
  });

  it("returns not-found errors when a provider cannot verify the identity", async () => {
    getGameCatalogRecordMock.mockResolvedValue(null);

    await expect(
      fetchProviderCatalogMedia({ source: "igdb", externalId: "404" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "IGDB media not found",
    });
  });

  it("preserves the provider's existing operational error", async () => {
    const providerError = internalServerError("TMDB request failed");
    getTmdbDetailsMock.mockRejectedValue(providerError);

    await expect(
      fetchProviderCatalogMedia({
        source: "tmdb_movie",
        externalId: "438631",
      }),
    ).rejects.toBe(providerError);
  });

  it("returns an existing canonical row without another provider request", async () => {
    dbSelectMock.mockReturnValue(
      createSelectBuilder([
        {
          id: "media-1",
          title: "Dune",
          type: "movie",
          imageUrl: "https://image.test/dune.jpg",
          description: "A desert epic.",
          metadata: { genre: ["Adventure"] },
        },
      ]),
    );

    await expect(
      ensureProviderCatalogMedia({
        source: "tmdb_movie",
        externalId: "438631",
      }),
    ).resolves.toMatchObject({
      id: "media-1",
      title: "Dune",
      source: "tmdb_movie",
      externalId: "438631",
    });
    expect(getTmdbDetailsMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("fetches seasons when resolving an existing TMDB show selection", async () => {
    dbSelectMock.mockReturnValue(
      createSelectBuilder([
        {
          id: "media-1",
          title: "Show",
          type: "show",
          imageUrl: null,
          description: null,
          metadata: {},
        },
      ]),
    );
    getTmdbDetailsMock.mockResolvedValue({
      id: "",
      source: "tmdb_tv",
      externalId: "100",
      title: "Show",
      type: "show",
      imageUrl: null,
      description: null,
      genres: [],
      runtimeMinutes: null,
      catalogRating: null,
      seasons: [{ seasonNumber: 1, episodeCount: 10 }],
    });

    await expect(
      resolveProviderMediaSelection({
        source: "tmdb_tv",
        externalId: "100",
      }),
    ).resolves.toMatchObject({
      id: "media-1",
      source: "tmdb_tv",
      seasons: [{ seasonNumber: 1, episodeCount: 10 }],
    });
    expect(getTmdbDetailsMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("reselects the canonical row when a concurrent resolve wins", async () => {
    dbSelectMock.mockReturnValue(createSelectBuilder([]));
    getTmdbDetailsMock.mockResolvedValue({
      id: "",
      source: "tmdb_movie",
      externalId: "438631",
      title: "Dune",
      type: "movie",
      imageUrl: null,
      description: null,
      genres: [],
      runtimeMinutes: null,
      catalogRating: null,
      seasons: [],
    });
    const insertBuilder = {
      values: vi.fn(),
      onConflictDoNothing: vi.fn(),
      returning: vi.fn().mockResolvedValue([]),
    };
    insertBuilder.values.mockReturnValue(insertBuilder);
    insertBuilder.onConflictDoNothing.mockReturnValue(insertBuilder);
    const tx = {
      insert: vi.fn().mockReturnValue(insertBuilder),
      select: vi.fn().mockReturnValue(
        createSelectBuilder([
          {
            id: "media-1",
            title: "Dune",
            type: "movie",
            imageUrl: null,
            description: null,
            metadata: {},
          },
        ]),
      ),
    };
    transactionMock.mockImplementation((callback) => callback(tx));

    await expect(
      ensureProviderCatalogMedia({
        source: "tmdb_movie",
        externalId: "438631",
      }),
    ).resolves.toMatchObject({ id: "media-1", title: "Dune" });
    expect(getTmdbDetailsMock).toHaveBeenCalledTimes(1);
    expect(insertBuilder.values).toHaveBeenCalledWith(
      expect.not.objectContaining({ seasons: expect.anything() }),
    );
    expect(insertBuilder.onConflictDoNothing).toHaveBeenCalled();
  });
});
