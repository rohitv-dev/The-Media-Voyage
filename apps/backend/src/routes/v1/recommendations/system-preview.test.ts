import { beforeEach, describe, expect, it, vi } from "vitest";
import { internalServerError } from "@/errors";

const {
  findSystemPreviewLibraryMock,
  findTmdbByImdbIdMock,
  getGameRecommendationsMock,
  getOpenLibraryRecommendationsMock,
  getTmdbRecommendationsMock,
  getTvMazeDetailsMock,
} = vi.hoisted(() => ({
  findSystemPreviewLibraryMock: vi.fn(),
  findTmdbByImdbIdMock: vi.fn(),
  getGameRecommendationsMock: vi.fn(),
  getOpenLibraryRecommendationsMock: vi.fn(),
  getTmdbRecommendationsMock: vi.fn(),
  getTvMazeDetailsMock: vi.fn(),
}));

vi.mock("./queries", () => ({
  findSystemPreviewLibrary: findSystemPreviewLibraryMock,
}));

vi.mock("@/services/tmdb", () => ({
  findTmdbByImdbId: findTmdbByImdbIdMock,
  getTmdbRecommendations: getTmdbRecommendationsMock,
}));

vi.mock("@/services/igdb", () => ({
  getGameRecommendations: getGameRecommendationsMock,
}));

vi.mock("@/services/openLibrary", () => ({
  getOpenLibraryRecommendations: getOpenLibraryRecommendationsMock,
}));

vi.mock("@/services/tvMaze", () => ({
  getTvMazeDetails: getTvMazeDetailsMock,
}));

import {
  getSystemRecommendationPreview,
  selectPreviewSeeds,
} from "./system-preview";

type LibraryItem = Parameters<typeof selectPreviewSeeds>[0][number];

const IDS = {
  first: "11111111-1111-4111-8111-111111111111",
  second: "22222222-2222-4222-8222-222222222222",
  third: "33333333-3333-4333-8333-333333333333",
  fourth: "44444444-4444-4444-8444-444444444444",
  fifth: "55555555-5555-4555-8555-555555555555",
  sixth: "66666666-6666-4666-8666-666666666666",
  seventh: "77777777-7777-4777-8777-777777777777",
};

function imdbId(value: number) {
  return `tt${String(value).padStart(7, "0")}`;
}

function libraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    userMediaId: IDS.first,
    title: "Seed",
    type: "movie",
    catalogSource: "omdb",
    externalId: imdbId(100),
    status: "completed",
    rating: null,
    favorite: false,
    completedAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    ...overrides,
  };
}

function movie(id: number, title: string) {
  return {
    id: "",
    source: "tmdb_movie" as const,
    externalId: String(id),
    title,
    type: "movie" as const,
    imageUrl: null,
  };
}

function show(id: number, title: string) {
  return {
    id: "",
    source: "tmdb_tv" as const,
    externalId: String(id),
    title,
    type: "show" as const,
    imageUrl: null,
  };
}

function game(id: number, title: string) {
  return {
    id: "",
    source: "igdb" as const,
    externalId: String(id),
    title,
    type: "game" as const,
    imageUrl: null,
  };
}

function book(id: string, title: string) {
  return {
    id: "",
    source: "open_library" as const,
    externalId: id,
    title,
    type: "book" as const,
    imageUrl: null,
  };
}

describe("system recommendation preview", () => {
  beforeEach(() => {
    findSystemPreviewLibraryMock.mockReset();
    findTmdbByImdbIdMock.mockReset();
    findTmdbByImdbIdMock.mockImplementation(
      async (externalId: string, type: "movie" | "show") => {
        const id = Number(externalId.slice(2));
        return type === "movie"
          ? movie(id, "Mapped movie")
          : show(id, "Mapped show");
      },
    );
    getTmdbRecommendationsMock.mockReset();
    getGameRecommendationsMock.mockReset();
    getOpenLibraryRecommendationsMock.mockReset();
    getTvMazeDetailsMock.mockReset();
  });

  it("ranks eligible seeds and excludes explicitly low-rated non-favorites", () => {
    const seeds = selectPreviewSeeds([
      libraryItem({
        userMediaId: IDS.first,
        title: "Recent Unrated",
        updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Highly Rated",
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Favorite",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.fourth,
        title: "Lower Rated",
        rating: 7,
      }),
      libraryItem({
        userMediaId: IDS.fifth,
        title: "Low Rated",
        rating: 6,
      }),
      libraryItem({
        userMediaId: IDS.sixth,
        title: "Deleted Favorite",
        favorite: true,
        deletedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
      libraryItem({
        userMediaId: IDS.seventh,
        title: "Planned Favorite",
        favorite: true,
        status: "planned",
      }),
    ]);

    expect(seeds.map((seed) => seed.title)).toEqual([
      "Favorite",
      "Highly Rated",
      "Lower Rated",
      "Recent Unrated",
    ]);
  });

  it("continues past unmapped seeds until three mapped seeds are found", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Unsupported Favorite",
        catalogSource: null,
        externalId: null,
        favorite: true,
        rating: 10,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Missing IMDb Favorite",
        type: "show",
        catalogSource: "tvmaze",
        externalId: "200",
        favorite: true,
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Mapped One",
        externalId: imdbId(301),
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.fourth,
        title: "Mapped Two",
        externalId: imdbId(302),
        rating: 8,
      }),
      libraryItem({
        userMediaId: IDS.fifth,
        title: "Mapped Three",
        externalId: imdbId(303),
        rating: 7,
      }),
    ]);
    getTvMazeDetailsMock.mockResolvedValue({ externals: { imdb: null } });
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) => [
        movie(500 + id, `Recommendation ${id}`),
      ],
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.seeds.map((seed) => seed.mappingStatus)).toEqual([
      "unmapped",
      "unmapped",
      "mapped",
      "mapped",
      "mapped",
    ]);
    expect(preview.seeds[0]).toMatchObject({
      catalogSource: null,
      catalogExternalId: null,
      mappingReason: "unsupported_source",
    });
    expect(preview.seeds[1]).toMatchObject({
      catalogSource: "tvmaze",
      catalogExternalId: "200",
      mappingReason: "missing_imdb_id",
    });
    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(3);
    expect(preview.recommendations).toHaveLength(3);
  });

  it("continues past mapped seeds with empty recommendation pages", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ userMediaId: IDS.first, rating: 10 }),
      libraryItem({
        userMediaId: IDS.second,
        externalId: imdbId(200),
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.third,
        externalId: imdbId(300),
        rating: 8,
      }),
      libraryItem({
        userMediaId: IDS.fourth,
        externalId: imdbId(400),
        rating: 7,
      }),
    ]);
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) =>
        id === 100 ? [] : [movie(500 + id, `Recommendation ${id}`)],
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.seeds).toHaveLength(4);
    expect(preview.seeds[0]).toMatchObject({
      mappingStatus: "mapped",
      candidateCount: 0,
    });
    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(4);
    expect(preview.recommendations).toHaveLength(3);
  });

  it("maps exact provider identities and round-robins filtered candidates", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "OMDb Favorite",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "OMDb Seed",
        catalogSource: "omdb",
        externalId: imdbId(200),
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "TVMaze Seed",
        type: "show",
        catalogSource: "tvmaze",
        externalId: "300",
        status: "revisiting",
      }),
      libraryItem({
        userMediaId: IDS.fourth,
        title: "Already Tracked",
        catalogSource: "omdb",
        externalId: imdbId(400),
        status: "planned",
      }),
      libraryItem({
        userMediaId: IDS.fifth,
        title: "Trashed Candidate",
        catalogSource: "omdb",
        externalId: imdbId(800),
        status: "planned",
        deletedAt: new Date("2026-02-01T00:00:00.000Z"),
      }),
    ]);
    getTvMazeDetailsMock.mockResolvedValue({
      externals: { imdb: imdbId(300) },
    });
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) => {
        if (id === 100) {
          return [
            movie(501, "First Movie"),
            movie(999, "Shared Candidate"),
            movie(700, "Already Tracked"),
          ];
        }
        if (id === 200) {
          return [movie(502, "Second Movie"), movie(999, "Shared Candidate")];
        }
        return [show(503, "First Show"), movie(800, "Trashed Candidate")];
      },
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(findTmdbByImdbIdMock).toHaveBeenCalledWith(imdbId(200), "movie");
    expect(findTmdbByImdbIdMock).toHaveBeenCalledWith(imdbId(300), "show");
    expect(getTvMazeDetailsMock).toHaveBeenCalledWith("300");
    expect(preview.eligibleSeedCount).toBe(3);
    expect(preview.seeds.map((seed) => seed.mappingStatus)).toEqual([
      "mapped",
      "mapped",
      "mapped",
    ]);
    expect(preview.seeds.map((seed) => seed.mappingReason)).toEqual([
      "imdb_match",
      "imdb_match",
      "imdb_match",
    ]);
    expect(preview.recommendations.map(({ media }) => media.title)).toEqual([
      "First Movie",
      "Second Movie",
      "First Show",
      "Shared Candidate",
    ]);
    expect(preview.recommendations[0]).toMatchObject({
      rank: 1,
      reason: 'Because "OMDb Favorite" is a favorite',
      seedUserMediaId: IDS.first,
    });
  });

  it("uses IGDB and Open Library recommendations for game and book seeds", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Game Seed",
        type: "game",
        catalogSource: "igdb",
        externalId: "100",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Book Seed",
        type: "book",
        catalogSource: "open_library",
        externalId: "OL123W",
        rating: 9,
      }),
    ]);
    getGameRecommendationsMock.mockResolvedValue([game(101, "Similar Game")]);
    getOpenLibraryRecommendationsMock.mockResolvedValue([
      book("OL456W", "Similar Book"),
    ]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getGameRecommendationsMock).toHaveBeenCalledWith("100");
    expect(getOpenLibraryRecommendationsMock).toHaveBeenCalledWith("OL123W");
    expect(findTmdbByImdbIdMock).not.toHaveBeenCalled();
    expect(preview.seeds).toMatchObject([
      {
        type: "game",
        mappingReason: "provider_id",
        recommendationSource: "igdb",
        recommendationExternalId: "100",
      },
      {
        type: "book",
        mappingReason: "provider_id",
        recommendationSource: "open_library",
        recommendationExternalId: "OL123W",
      },
    ]);
    expect(preview.recommendations.map(({ media }) => media)).toMatchObject([
      { source: "igdb", type: "game", title: "Similar Game" },
      {
        source: "open_library",
        type: "book",
        title: "Similar Book",
      },
    ]);
  });

  it("returns an empty preview without calling providers when there are no eligible seeds", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ status: "planned" }),
      libraryItem({ userMediaId: IDS.second, rating: 6 }),
    ]);

    await expect(getSystemRecommendationPreview("user-1")).resolves.toEqual({
      strategyKey: "provider_recommendations",
      strategyVersion: "1",
      eligibleSeedCount: 0,
      seeds: [],
      recommendations: [],
    });
    expect(getTmdbRecommendationsMock).not.toHaveBeenCalled();
  });

  it("returns partial results and marks a failed seed without exposing its error", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ userMediaId: IDS.first, favorite: true }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Working Seed",
        externalId: imdbId(200),
        rating: 8,
      }),
    ]);
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) => {
        if (id === 100) throw internalServerError("TMDB request failed");
        return [movie(501, "Working Recommendation")];
      },
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.seeds.map((seed) => seed.mappingStatus)).toEqual([
      "provider_error",
      "mapped",
    ]);
    expect(preview.recommendations).toHaveLength(1);
    expect(JSON.stringify(preview)).not.toContain("TMDB request failed");
  });

  it("propagates the sanitized provider error when every selected seed fails", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ userMediaId: IDS.first, favorite: true }),
      libraryItem({
        userMediaId: IDS.second,
        externalId: imdbId(200),
        rating: 8,
      }),
    ]);
    getTmdbRecommendationsMock.mockRejectedValue(
      internalServerError("TMDB request failed"),
    );

    await expect(
      getSystemRecommendationPreview("user-1"),
    ).rejects.toMatchObject({
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "TMDB request failed",
    });
  });

  it("reports exact-identity misses as unmapped without a title fallback", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        catalogSource: "omdb",
        externalId: "tt1234567",
      }),
    ]);
    findTmdbByImdbIdMock.mockResolvedValue(null);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.seeds[0]).toMatchObject({
      catalogSource: "omdb",
      catalogExternalId: "tt1234567",
      mappingStatus: "unmapped",
      mappingReason: "tmdb_not_found",
      recommendationSource: null,
      recommendationExternalId: null,
      candidateCount: 0,
    });
    expect(preview.recommendations).toEqual([]);
    expect(getTmdbRecommendationsMock).not.toHaveBeenCalled();
  });

  it("limits the blended result to ten recommendations", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([libraryItem()]);
    getTmdbRecommendationsMock.mockResolvedValue(
      Array.from({ length: 15 }, (_, index) =>
        movie(500 + index, `Candidate ${index + 1}`),
      ),
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.recommendations).toHaveLength(10);
    expect(preview.recommendations.at(-1)?.rank).toBe(10);
  });
});
