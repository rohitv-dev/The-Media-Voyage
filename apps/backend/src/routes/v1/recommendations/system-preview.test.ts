import { beforeEach, describe, expect, it, vi } from "vitest";
import { internalServerError } from "@/errors";

const {
  findDismissedSystemRecommendationsMock,
  findSystemPreviewLibraryMock,
  getGameRecommendationsMock,
  getOpenLibraryRecommendationsMock,
  getTmdbRecommendationsMock,
} = vi.hoisted(() => ({
  findDismissedSystemRecommendationsMock: vi.fn(),
  findSystemPreviewLibraryMock: vi.fn(),
  getGameRecommendationsMock: vi.fn(),
  getOpenLibraryRecommendationsMock: vi.fn(),
  getTmdbRecommendationsMock: vi.fn(),
}));

vi.mock("./queries", () => ({
  findDismissedSystemRecommendations: findDismissedSystemRecommendationsMock,
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

function book(
  id: string,
  title: string,
  metadata: {
    creators?: string[];
    genres?: string[];
    numberOfPages?: number;
  } = {},
) {
  return {
    id: "",
    source: "open_library" as const,
    externalId: id,
    title,
    type: "book" as const,
    imageUrl: null,
    ...metadata,
  };
}

describe("system recommendation preview", () => {
  beforeEach(() => {
    findSystemPreviewLibraryMock.mockReset();
    findDismissedSystemRecommendationsMock.mockReset();
    findDismissedSystemRecommendationsMock.mockResolvedValue([]);
    getTmdbRecommendationsMock.mockReset();
    getGameRecommendationsMock.mockReset();
    getOpenLibraryRecommendationsMock.mockReset();
  });

  it("skips dismissed candidates and keeps trying seeds that have no usable result", async () => {
    const seedIds = [
      IDS.first,
      IDS.second,
      IDS.third,
      IDS.fourth,
      IDS.fifth,
      IDS.sixth,
      IDS.seventh,
    ];
    findSystemPreviewLibraryMock.mockResolvedValue(
      seedIds.map((userMediaId, index) =>
        libraryItem({
          userMediaId,
          externalId: String(100 + index),
          favorite: true,
        }),
      ),
    );
    findDismissedSystemRecommendationsMock.mockResolvedValue(
      seedIds.slice(0, 6).map((_, index) => ({
        source: "tmdb_movie",
        externalId: String(700 + index),
      })),
    );
    for (let index = 0; index < 6; index += 1) {
      getTmdbRecommendationsMock.mockResolvedValueOnce([
        movie(700 + index, `Dismissed ${index}`),
      ]);
    }
    getTmdbRecommendationsMock.mockResolvedValueOnce([movie(999, "Useful")]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(7);
    expect(preview.recommendations.map(({ media }) => media.title)).toEqual([
      "Useful",
    ]);
    expect(preview.seeds).toHaveLength(7);
  });

  it("selects favorites, highly rated media, revisiting items, and unrated completions", () => {
    const seeds = selectPreviewSeeds([
      libraryItem({
        userMediaId: IDS.first,
        title: "Completed Low Rated",
        rating: 6,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Revisiting Low Rated",
        status: "revisiting",
        rating: 5,
      }),
      libraryItem({
        userMediaId: "88888888-8888-4888-8888-888888888888",
        title: "Completed Unrated",
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Favorite In Progress",
        favorite: true,
        status: "in_progress",
      }),
      libraryItem({
        userMediaId: IDS.fourth,
        title: "Highly Rated In Progress",
        status: "in_progress",
        rating: 8,
      }),
      libraryItem({
        userMediaId: IDS.fifth,
        title: "Unrated In Progress",
        status: "in_progress",
      }),
      libraryItem({
        userMediaId: IDS.sixth,
        title: "Low Rated In Progress",
        status: "in_progress",
        rating: 6,
      }),
      libraryItem({
        userMediaId: IDS.seventh,
        title: "Planned Favorite",
        favorite: true,
        rating: 10,
        status: "planned",
      }),
      libraryItem({
        title: "Dropped Favorite",
        favorite: true,
        status: "dropped",
      }),
      libraryItem({
        title: "On Hold Favorite",
        favorite: true,
        status: "on_hold",
      }),
    ]);

    expect(seeds.map((seed) => seed.title)).toEqual([
      "Planned Favorite",
      "Dropped Favorite",
      "On Hold Favorite",
      "Favorite In Progress",
      "Highly Rated In Progress",
      "Revisiting Low Rated",
      "Completed Unrated",
    ]);
  });

  it("uses the most recent completion or update date for seed tie-breaking", () => {
    const seeds = selectPreviewSeeds([
      libraryItem({
        userMediaId: IDS.first,
        title: "Updated Later",
        rating: 8,
        completedAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-07-01T00:00:00.000Z"),
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Completed Later",
        rating: 8,
        completedAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      }),
    ]);

    expect(seeds.map((seed) => seed.title)).toEqual([
      "Updated Later",
      "Completed Later",
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

  it("includes an in-progress favorite show as a seed", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Ted",
        type: "show",
        catalogSource: "tmdb_tv",
        externalId: "100",
        favorite: true,
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Ted Lasso",
        type: "show",
        catalogSource: "tmdb_tv",
        externalId: "200",
        status: "in_progress",
        favorite: true,
        rating: 9,
      }),
    ]);
    getTmdbRecommendationsMock.mockResolvedValue([]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getTmdbRecommendationsMock).toHaveBeenNthCalledWith(1, "show", 100);
    expect(getTmdbRecommendationsMock).toHaveBeenNthCalledWith(2, "show", 200);
    expect(preview.seeds.map((seed) => seed.title)).toEqual([
      "Ted",
      "Ted Lasso",
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

  it("aggregates duplicate candidates and ranks multi-seed matches first", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Favorite Seed",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Rated Seed",
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
        movie(999, "Shared Candidate"),
        movie(501, "First Movie"),
      ])
      .mockResolvedValueOnce([
        movie(999, "Shared Candidate"),
        movie(502, "Second Movie"),
      ]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.recommendations.map(({ media }) => media.title)).toEqual([
      "Shared Candidate",
      "First Movie",
      "Second Movie",
    ]);
    expect(preview.recommendations[0]).toMatchObject({
      rank: 1,
      reason:
        'Because "Favorite Seed" is a favorite and you rated "Rated Seed" 9/10',
      seedUserMediaId: IDS.first,
      seedUserMediaIds: [IDS.first, IDS.second],
    });
  });

  it("caps combined reasons at two explicit seed titles", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Favorite Seed",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Rated Seed",
        externalId: "200",
        rating: 9,
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Completed Seed",
        externalId: "300",
      }),
    ]);
    getTmdbRecommendationsMock.mockResolvedValue([movie(999, "Shared Candidate")]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.recommendations[0]).toMatchObject({
      reason:
        'Because "Favorite Seed" is a favorite, you rated "Rated Seed" 9/10, and 1 other titles you liked',
      seedUserMediaId: IDS.first,
      seedUserMediaIds: [IDS.first, IDS.second, IDS.third],
    });
  });

  it("uses title exclusion only for incomplete library identities", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "Recommendation Seed",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Remake Title",
        externalId: "700",
        status: "planned",
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Legacy Title",
        catalogSource: null,
        externalId: null,
        status: "planned",
      }),
    ]);
    getTmdbRecommendationsMock.mockResolvedValue([
      movie(701, "Remake Title"),
      movie(702, "Legacy Title"),
      movie(703, "Usable Candidate"),
    ]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.recommendations.map(({ media }) => media.title)).toEqual([
      "Remake Title",
      "Usable Candidate",
    ]);
  });

  it("does not count fully excluded candidates as productive", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        title: "First Seed",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.second,
        title: "Second Seed",
        externalId: "200",
        favorite: true,
      }),
      libraryItem({
        userMediaId: IDS.third,
        title: "Tracked Title",
        catalogSource: null,
        externalId: null,
        status: "planned",
      }),
    ]);
    getTmdbRecommendationsMock
      .mockResolvedValueOnce([
        movie(701, "Tracked Title"),
      ])
      .mockResolvedValueOnce([movie(702, "Useful Candidate")]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(2);
    expect(preview.seeds.map((seed) => seed.title)).toEqual([
      "First Seed",
      "Second Seed",
    ]);
    expect(preview.seeds.map((seed) => seed.candidateCount)).toEqual([1, 1]);
    expect(preview.recommendations.map(({ media }) => media.title)).toEqual([
      "Useful Candidate",
    ]);
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
      book("OL456W", "Similar Book", {
        creators: ["Example Author"],
        genres: ["Science fiction"],
        numberOfPages: 320,
      }),
    ]);

    const preview = await getSystemRecommendationPreview("user-1");

    expect(getGameRecommendationsMock).toHaveBeenCalledWith("100");
    expect(getOpenLibraryRecommendationsMock).toHaveBeenCalledWith("OL123W");
    expect(getTmdbRecommendationsMock).not.toHaveBeenCalled();
    expect(preview.recommendations.map(({ media }) => media.source)).toEqual([
      "igdb",
      "open_library",
    ]);
    expect(preview.recommendations[1].media).toMatchObject({
      creators: ["Example Author"],
      genres: ["Science fiction"],
      numberOfPages: 320,
    });
  });

  it("returns version 4 without provider calls when no seed is eligible", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({ status: "planned" }),
      libraryItem({
        userMediaId: IDS.second,
        status: "in_progress",
        rating: 6,
      }),
    ]);

    await expect(getSystemRecommendationPreview("user-1")).resolves.toEqual({
      strategyKey: "provider_recommendations",
      strategyVersion: "4",
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

  it("propagates mapped provider errors even when another seed is unmapped", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue([
      libraryItem({
        userMediaId: IDS.first,
        catalogSource: null,
        externalId: null,
        favorite: true,
      }),
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
    expect(getTmdbRecommendationsMock).toHaveBeenCalledTimes(1);
  });

  it("caps each seed at three and the final list at ten recommendations", async () => {
    findSystemPreviewLibraryMock.mockResolvedValue(
      [IDS.first, IDS.second, IDS.third, IDS.fourth].map(
        (userMediaId, seedIndex) =>
          libraryItem({
            userMediaId,
            title: `Seed ${seedIndex + 1}`,
            externalId: String(100 + seedIndex),
          }),
      ),
    );
    getTmdbRecommendationsMock.mockImplementation(
      async (_type: "movie" | "show", id: number) =>
        Array.from({ length: 5 }, (_, index) =>
          movie(id * 10 + index, `Candidate ${id}-${index + 1}`),
        ),
    );

    const preview = await getSystemRecommendationPreview("user-1");

    expect(preview.recommendations).toHaveLength(10);
    expect(preview.recommendations.at(-1)?.rank).toBe(10);
    expect(
      preview.recommendations.reduce<Record<string, number>>(
        (counts, recommendation) => {
          for (const seedId of recommendation.seedUserMediaIds) {
            counts[seedId] = (counts[seedId] ?? 0) + 1;
          }
          return counts;
        },
        {},
      ),
    ).toEqual({
      [IDS.first]: 3,
      [IDS.second]: 3,
      [IDS.third]: 3,
      [IDS.fourth]: 1,
    });
  });
});
