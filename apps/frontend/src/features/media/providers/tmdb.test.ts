import type { TmdbMediaDetails } from "@media-voyage/shared/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("#/lib/api", () => ({ api: apiMock }));

import { hydrateTmdb, mergeTmdbSeasons } from "./tmdb";

function details(overrides: Partial<TmdbMediaDetails> = {}): TmdbMediaDetails {
  return {
    id: "",
    source: "tmdb_tv",
    externalId: "100",
    title: "Example Show",
    type: "show",
    imageUrl: null,
    description: "A show description.",
    genres: ["Drama", "Mystery"],
    runtimeMinutes: 45,
    catalogRating: 8.2,
    seasons: [{ seasonNumber: 1, episodeCount: 10 }],
    ...overrides,
  };
}

describe("TMDB frontend hydration", () => {
  beforeEach(() => apiMock.mockReset());

  it("hydrates movie metadata without season progress", async () => {
    apiMock.mockResolvedValue(
      details({
        source: "tmdb_movie",
        type: "movie",
        title: "Example Movie",
        seasons: [],
      }),
    );

    await expect(
      hydrateTmdb({
        id: "",
        source: "tmdb_movie",
        externalId: "100",
        title: "Example Movie",
        type: "movie",
        imageUrl: null,
      }),
    ).resolves.toEqual({
      description: "A show description.",
      metadata: {
        genre: ["Drama", "Mystery"],
        runtime: 45,
        catalogRating: 8.2,
      },
    });
    expect(apiMock).toHaveBeenCalledWith("/media/tmdb/movie/100");
  });

  it("hydrates show metadata and season episode counts", async () => {
    apiMock.mockResolvedValue(
      details({
        seasons: [
          { seasonNumber: 1, episodeCount: 10 },
          { seasonNumber: 2, episodeCount: 8 },
        ],
      }),
    );

    const hydrated = await hydrateTmdb({
      id: "",
      source: "tmdb_tv",
      externalId: "100",
      title: "Example Show",
      type: "show",
      imageUrl: null,
    });

    expect(hydrated.seasonsProgress).toMatchObject([
      { season: 1, expectedEpisodeCount: 10, episodesWatched: 0 },
      { season: 2, expectedEpisodeCount: 8, episodesWatched: 0 },
    ]);
    expect(apiMock).toHaveBeenCalledWith("/media/tmdb/show/100");
  });

  it("keeps optional metadata absent when TMDB has no values", async () => {
    apiMock.mockResolvedValue(
      details({
        description: null,
        genres: [],
        runtimeMinutes: null,
        catalogRating: null,
        seasons: [],
      }),
    );

    await expect(
      hydrateTmdb({
        id: "",
        source: "tmdb_tv",
        externalId: "100",
        title: "Example Show",
        type: "show",
        imageUrl: null,
      }),
    ).resolves.toEqual({ seasonsProgress: [] });
  });
});

describe("TMDB season merge", () => {
  it("updates provider counts, adds seasons, and preserves user data", () => {
    const merged = mergeTmdbSeasons(
      [
        {
          season: 1,
          expectedEpisodeCount: 8,
          episodesWatched: 4,
          status: "in_progress",
          rating: 9,
          notes: "Keep this",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          season: 9,
          expectedEpisodeCount: 2,
          episodesWatched: 1,
          status: "in_progress",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          season: 1,
          expectedEpisodeCount: 10,
          episodesWatched: 0,
          status: "planned",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
        {
          season: 2,
          expectedEpisodeCount: 6,
          episodesWatched: 0,
          status: "planned",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    );

    expect(merged).toMatchObject([
      {
        season: 1,
        expectedEpisodeCount: 10,
        episodesWatched: 4,
        status: "in_progress",
        rating: 9,
        notes: "Keep this",
      },
      {
        season: 9,
        expectedEpisodeCount: 2,
        episodesWatched: 1,
      },
      { season: 2, expectedEpisodeCount: 6, episodesWatched: 0 },
    ]);
  });

  it("never lowers a season below its watched episode count", () => {
    const [season] = mergeTmdbSeasons(
      [
        {
          season: 1,
          expectedEpisodeCount: 12,
          episodesWatched: 11,
          status: "in_progress",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      [
        {
          season: 1,
          expectedEpisodeCount: 8,
          episodesWatched: 0,
          status: "planned",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ],
    );

    expect(season.expectedEpisodeCount).toBe(11);
    expect(season.episodesWatched).toBe(11);
  });
});
