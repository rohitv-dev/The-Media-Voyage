import { describe, expect, it, vi } from "vitest";
import {
  applyCatalogRefresh,
  getCatalogRefreshChanges,
  refreshIgdb,
  refreshOmdb,
  refreshOpenLibrary,
  refreshTvMaze,
} from "./catalogMetadataRefresh";

describe("catalog metadata refresh mappings", () => {
  it("maps OMDb movie details", () => {
    expect(
      refreshOmdb({
        Title: "Dune",
        Year: "2021",
        imdbID: "tt1160419",
        Type: "movie",
        Poster: "poster",
        Plot: "A desert epic.",
        Genre: "Adventure, Drama",
        Runtime: "155 min",
        imdbRating: "8.0",
      }),
    ).toEqual({
      description: "A desert epic.",
      metadata: {
        genre: "Adventure, Drama",
        runtime: "155 min",
        catalogRating: "8.0/10",
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
        rating: 89.4,
      }),
    ).toEqual({
      description: "An adventure.",
      metadata: { genre: "RPG", catalogRating: "8.9/10" },
    });
  });

  it("strips TVMaze HTML while preserving its metadata", () => {
    expect(
      refreshTvMaze({
        id: 1,
        name: "Show",
        genres: ["Drama", "Mystery"],
        image: null,
        rating: { average: 8.2 },
        summary: "<p>A &amp; B <strong>story</strong>.</p>",
        runtime: 45,
        averageRuntime: null,
        seasons: [],
      }),
    ).toEqual({
      description: "A & B story.",
      metadata: {
        genre: "Drama, Mystery",
        runtime: "45 min",
        catalogRating: "8.2/10",
      },
    });
  });

  it("maps Open Library work details", () => {
    expect(
      refreshOpenLibrary({
        description: "A book description.",
        genres: ["Fantasy", "Adventure", "Magic", "Epic", "Fiction", "Ignored"],
        numberOfPages: 412,
      }),
    ).toEqual({
      description: "A book description.",
      metadata: {
        genre: "Fantasy, Adventure, Magic, Epic, Fiction",
        numberOfPages: 412,
      },
    });
  });
});

describe("catalog metadata refresh changes", () => {
  it("only returns fields that changed, allowing dry runs to avoid writes", () => {
    expect(
      getCatalogRefreshChanges(
        {
          description: "Existing description",
          metadata: { genre: "Drama" },
        },
        {
          description: "Existing description",
          metadata: { genre: "Drama", runtime: "60 min" },
        },
      ),
    ).toEqual({ metadata: { genre: "Drama", runtime: "60 min" } });
  });

  it("preserves existing values when the provider has no usable refresh", () => {
    expect(
      getCatalogRefreshChanges(
        {
          description: "Existing description",
          metadata: { genre: "Drama" },
        },
        {},
      ),
    ).toEqual({});
  });

  it("does not write during a dry run", async () => {
    const writeChanges = vi.fn();

    await expect(
      applyCatalogRefresh(
        "dry-run",
        { description: null, metadata: {} },
        { metadata: { genre: "Drama" } },
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
        { metadata: { genre: "Drama" } },
        writeChanges,
      ),
    ).resolves.toBe("updated");

    expect(writeChanges).toHaveBeenCalledWith({ metadata: { genre: "Drama" } });
  });
});
