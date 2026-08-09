import { beforeEach, describe, expect, it, vi } from "vitest";
import { internalServerError } from "@/errors";

const {
  findSystemPreviewLibraryMock,
  getGameRecommendationsMock,
  getOpenLibraryRecommendationsMock,
  getTmdbRecommendationsMock,
} = vi.hoisted(() => ({
  findSystemPreviewLibraryMock: vi.fn(),
  getGameRecommendationsMock: vi.fn(),
  getOpenLibraryRecommendationsMock: vi.fn(),
  getTmdbRecommendationsMock: vi.fn(),
}));

vi.mock("./queries", () => ({
  findSystemPreviewLibrary: findSystemPreviewLibraryMock,
}));

vi.mock("@/services/tmdb", () => ({
  getTmdbRecommendations: getTmdbRecommendationsMock,
}));

vi.mock("@/services/igdb", () => ({
  getGameRecommendations: getGameRecommendationsMock,
}));

vi.mock("@/services/openLibrary", () => ({
  getOpenLibraryRecommendations: getOpenLibraryRecommendationsMock,
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

function libraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    userMediaId: IDS.first,
    title: "Seed",
    type: "movie",
    catalogSource: "tmdb_movie",
    externalId: "100",
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
    getTmdbRecommendationsMock.mockReset();
    getGameRecommendationsMock.mockReset();
    getOpenLibraryRecommendationsMock.mockReset();
  });

  it("ranks eligible seeds and excludes low-rated non-favorites", () => {
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
      libraryItem({ userMediaId: IDS.fifth, rating: 6 }),
      libraryItem({
        userMediaId: IDS.sixth,
        favorite: true,
        deletedAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
      libraryItem({
        userMediaId: IDS.seventh,
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

  it("uses stored TMDB IDs directly for movies and shows", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ userMediaId: IDS.first, favorite: true }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Show Seed",
        type: "show",
        catalogSource: "tmdb_tv",
        externalId: "200",
        rating: 9,
      }),
    ]);
    getTmdbRecommendationsMock
      .mockResolvedValueOnce([movie(501, "Movie Recommendation")])
      .mockResolvedValueOnce([show(502, "Show Recommendation")]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getTmdbRecommendationsMock).toHaveBeenNthCalledWith(1, "movie", 100);
    expect(getTmdbRecommendationsMock).toHaveBeenNthCalledWith(2, "show", 200);
    expect(preview.seeds).toMatchObject([
      {
        mappingReason: "provider_id",
        recommendationSource: "tmdb_movie",
        recommendationExternalId: "100",
      },
      {
        mappingReason: "provider_id",
        recommendationSource: "tmdb_tv",
        recommendationExternalId: "200",
      },
    ]);
  });

  it("continues past unmapped and empty seeds", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        catalogSource: null,
        externalId: null,
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        externalId: "invalid",
        rating: 10,
      }),
      libraryItem({ userMediaId: IDS.third, externalId: "100", rating: 9 }),
      libraryItem({ userMediaId: IDS.fourth, externalId: "200", rating: 8 }),
      libraryItem({ userMediaId: IDS.fifth, externalId: "300", rating: 7 }),
      libraryItem({ userMediaId: IDS.sixth, externalId: "400", rating: 7 }),
    ]);
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) =>
        id === 100 ? [] : [movie(500 + id, `Recommendation ${id}`)],
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.seeds.map((seed) => seed.mappingStatus)).toEqual([
      "unmapped",
      "unmapped",
      "mapped",
      "mapped",
      "mapped",
      "mapped",
    ]);
    expect(preview.seeds[0].mappingReason).toBe("unsupported_source");
    expect(preview.seeds[1].mappingReason).toBe("invalid_external_id");
    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(4);
    expect(preview.recommendations).toHaveLength(3);
  });

  it("uses up to six productive seeds", async () => {
    const userMediaIds = Object.values(IDS);
    findSystemPreviewLibraryMock.mockResolvedValue(
      userMediaIds.map((userMediaId, index) =>
        libraryItem({
          userMediaId,
          title: `Seed ${index + 1}`,
          externalId: String(100 + index),
        }),
      ),
    );
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) => [
        movie(500 + id, `Recommendation ${id}`),
      ],
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(6);
    expect(preview.seeds).toHaveLength(6);
    expect(preview.recommendations).toHaveLength(6);
  });

  it("round-robins candidates and excludes tracked titles", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Favorite Movie",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Rated Movie",
        externalId: "200",
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Already Tracked",
        externalId: "700",
        status: "planned",
      }),
    ]);
    getTmdbRecommendationsMock
      .mockResolvedValueOnce([
        movie(501, "First Movie"),
        movie(999, "Shared Candidate"),
        movie(700, "Already Tracked"),
      ])
      .mockResolvedValueOnce([
        movie(502, "Second Movie"),
        movie(999, "Shared Candidate"),
      ]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.recommendations.map(({ media }) => media.title)).toEqual([
      "First Movie",
      "Second Movie",
      "Shared Candidate",
    ]);
    expect(preview.recommendations[0]).toMatchObject({
      rank: 1,
      reason: 'Because "Favorite Movie" is a favorite',
      seedUserMediaId: IDS.first,
    });
  });

  it("keeps IGDB and Open Library recommendation behavior", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        type: "game",
        catalogSource: "igdb",
        externalId: "100",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
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
    expect(getTmdbRecommendationsMock).not.toHaveBeenCalled();
    expect(preview.recommendations.map(({ media }) => media.source)).toEqual([
      "igdb",
      "open_library",
    ]);
  });

  it("returns version 3 without provider calls when no seed is eligible", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ status: "planned" }),
      libraryItem({ userMediaId: IDS.second, rating: 6 }),
    ]);

    await expect(getSystemRecommendationPreview("user-1")).resolves.toEqual({
      strategyKey: "provider_recommendations",
      strategyVersion: "3",
      eligibleSeedCount: 0,
      seeds: [],
      recommendations: [],
    });
    expect(getTmdbRecommendationsMock).not.toHaveBeenCalled();
  });

  it("returns partial results without exposing a failed provider error", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ userMediaId: IDS.first, favorite: true }),
      libraryItem({ userMediaId: IDS.second, externalId: "200", rating: 8 }),
    ]);
    getTmdbRecommendationsMock
      .mockRejectedValueOnce(internalServerError("TMDB request failed"))
      .mockResolvedValueOnce([movie(501, "Working Recommendation")]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.seeds.map((seed) => seed.mappingStatus)).toEqual([
      "provider_error",
      "mapped",
    ]);
    expect(preview.recommendations).toHaveLength(1);
    expect(JSON.stringify(preview)).not.toContain("TMDB request failed");
  });

  it("propagates the sanitized error when every selected seed fails", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ userMediaId: IDS.first, favorite: true }),
      libraryItem({ userMediaId: IDS.second, externalId: "200", rating: 8 }),
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

  it("limits blended results to ten recommendations", async () => {
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
