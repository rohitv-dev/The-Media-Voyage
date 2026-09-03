import { describe, expect, it, vi } from "vitest";
import {
  applyCatalogRefresh,
  getCatalogRefreshChanges,
  refreshIgdb,
  refreshOpenLibrary,
  refreshTmdb,
} from "./catalogMetadataRefresh";

describe("catalog metadata refresh mappings", () => {
  it("maps TMDB movie details", () => {
    expect(
      refreshTmdb({
        id: "",
        source: "tmdb_movie",
        externalId: "438631",
        title: "Dune",
        type: "movie",
        imageUrl: null,
        releaseDate: "2024-10-22",
        description: "A desert epic.",
        genres: ["Adventure", "Drama"],
        keywords: ["space travel", "politics"],
        runtimeMinutes: 155,
        catalogRating: 8,
        seasons: [],
      }),
    ).toEqual({
      description: "A desert epic.",
      metadata: {
        genre: ["Adventure", "Drama"],
        keywords: ["space travel", "politics"],
        runtime: 155,
        catalogRating: 8,
        releaseDate: "2024-10-22",
      },
    });
  });

  it("maps IGDB game details", () => {
    expect(
      refreshIgdb({
        id: 1,
        name: "Game",
        summary: "An adventure.",
        genres: [{ id: 2, name: "RPG" }],
        releaseDate: "2024-01-01",
        themes: ["Dark fantasy"],
        keywords: ["boss battles", "medieval"],
        gameModes: ["Single player"],
        playerPerspectives: ["Third person"],
        rating: 89.4,
      }),
    ).toEqual({
      description: "An adventure.",
      metadata: {
        genre: ["RPG"],
        themes: ["Dark fantasy"],
        keywords: ["boss battles", "medieval"],
        gameModes: ["Single player"],
        playerPerspectives: ["Third person"],
        catalogRating: 8.9,
        releaseDate: "2024-01-01",
      },
    });
  });

  it("maps TMDB show details", () => {
    expect(
      refreshTmdb({
        id: "",
        source: "tmdb_tv",
        externalId: "1",
        title: "Show",
        type: "show",
        imageUrl: null,
        description: "A story.",
        genres: ["Drama", "Mystery"],
        runtimeMinutes: 45,
        catalogRating: 8.2,
        seasons: [],
      }),
    ).toEqual({
      description: "A story.",
      metadata: {
        genre: ["Drama", "Mystery"],
        runtime: 45,
        catalogRating: 8.2,
      },
    });
  });

  it("maps Open Library work details", () => {
    expect(
      refreshOpenLibrary({
        description: "A book description.",
        releaseDate: "1997-01-01",
        genres: ["Fantasy", "Adventure", "Magic", "Epic", "Fiction", "Ignored"],
        subjects: [
          "Fantasy",
          "Magic",
          "Epic",
          "Fiction",
          "Ignored",
          "Space opera",
        ],
        numberOfPages: 412,
      }),
    ).toEqual({
      description: "A book description.",
      metadata: {
        genre: ["Fantasy", "Adventure", "Magic", "Epic", "Fiction"],
        subjects: [
          "Fantasy",
          "Magic",
          "Epic",
          "Fiction",
          "Ignored",
          "Space opera",
        ],
        numberOfPages: 412,
        releaseDate: "1997-01-01",
      },
    });
  });
});

describe("catalog metadata refresh changes", () => {
  it("does not write when the merged metadata is unchanged", () => {
    expect(
      getCatalogRefreshChanges(
        {
          description: "Existing description",
          metadata: { keywords: ["space travel"] },
        },
        {
          description: "Existing description",
          metadata: { keywords: ["space travel"] },
        },
      ),
    ).toEqual({});
  });

  it("only returns fields that changed, allowing dry runs to avoid writes", () => {
    expect(
      getCatalogRefreshChanges(
        {
          description: "Existing description",
          metadata: { genre: ["Drama"] },
        },
        {
          description: "Existing description",
          metadata: { genre: ["Drama"], runtime: 60 },
        },
      ),
    ).toEqual({ metadata: { genre: ["Drama"], runtime: 60 } });
  });

  it("preserves existing values when the provider has no usable refresh", () => {
    expect(
      getCatalogRefreshChanges(
        {
          description: "Existing description",
          metadata: { genre: ["Drama"] },
        },
        {},
      ),
    ).toEqual({});
  });

  it("merges non-empty metadata without erasing existing enrichment", () => {
    expect(
      getCatalogRefreshChanges(
        {
          description: "Existing description",
          metadata: {
            genre: ["RPG"],
            themes: ["Dark fantasy"],
            keywords: ["old keyword"],
          },
        },
        {
          metadata: {
            keywords: [],
            gameModes: ["Single player"],
          },
        },
      ),
    ).toEqual({
      metadata: {
        genre: ["RPG"],
        themes: ["Dark fantasy"],
        keywords: ["old keyword"],
        gameModes: ["Single player"],
      },
    });
  });

  it("does not write during a dry run", async () => {
    const writeChanges = vi.fn();

    await expect(
      applyCatalogRefresh(
        "dry-run",
        { description: null, metadata: {} },
        { metadata: { genre: ["Drama"] } },
        writeChanges,
      ),
    ).resolves.toBe("updated");

    expect(writeChanges).not.toHaveBeenCalled();
  });

  it("writes only the changed values when applying", async () => {
    const writeChanges = vi.fn().mockResolvedValue(undefined);

    await expect(
      applyCatalogRefresh(
        "apply",
        { description: null, metadata: {} },
        { metadata: { genre: ["Drama"] } },
        writeChanges,
      ),
    ).resolves.toBe("updated");

    expect(writeChanges).toHaveBeenCalledWith({
      metadata: { genre: ["Drama"] },
    });
  });
});
