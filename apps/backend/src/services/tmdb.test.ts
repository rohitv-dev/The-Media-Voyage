import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors";

const TEST_TOKEN = "tmdb-test-read-token";
const fetchMock = vi.fn();

vi.mock("../config", () => ({
  env: {
    TMDB_API_READ_ACCESS_TOKEN: "tmdb-test-read-token",
  },
}));

import { getTmdbDetails, getTmdbRecommendations, searchTmdb } from "./tmdb";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("TMDB service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("searches movies with bearer authentication and filters adult results", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: 11,
            title: "Star Voyage",
            adult: false,
            poster_path: "/star.jpg",
          },
          {
            id: 12,
            title: "Adult Result",
            adult: true,
            poster_path: "/adult.jpg",
          },
          {
            id: 13,
            title: "No Poster",
            adult: false,
            poster_path: null,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchTmdb("star wars & beyond", "movie")).resolves.toEqual([
      {
        id: "",
        source: "tmdb_movie",
        externalId: "11",
        title: "Star Voyage",
        type: "movie",
        imageUrl: "https://image.tmdb.org/t/p/w500/star.jpg",
      },
      {
        id: "",
        source: "tmdb_movie",
        externalId: "13",
        title: "No Poster",
        type: "movie",
        imageUrl: null,
      },
    ]);

    const [requestUrl, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const url = new URL(String(requestUrl));

    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe("star wars & beyond");
    expect(url.searchParams.get("include_adult")).toBe("false");
    expect(url.searchParams.get("language")).toBe("en-US");
    expect(url.searchParams.get("page")).toBe("1");
    expect(options.headers).toEqual({
      Accept: "application/json",
      Authorization: `Bearer ${TEST_TOKEN}`,
    });
  });

  it("maps TMDB TV searches to Media Voyage shows", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: 21,
            name: "The Long Watch",
            adult: false,
            poster_path: "/watch.jpg",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchTmdb("long watch", "show")).resolves.toEqual([
      {
        id: "",
        source: "tmdb_tv",
        externalId: "21",
        title: "The Long Watch",
        type: "show",
        imageUrl: "https://image.tmdb.org/t/p/w500/watch.jpg",
      },
    ]);

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      "/3/search/tv",
    );
  });

  it("normalizes movie details", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 31,
        title: "A Detailed Movie",
        adult: false,
        poster_path: "/movie.jpg",
        overview: "  A useful description.  ",
        genres: [{ name: "Drama" }, { name: "Mystery" }],
        runtime: 127,
        vote_average: 8.4,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTmdbDetails("movie", 31)).resolves.toEqual({
      id: "",
      source: "tmdb_movie",
      externalId: "31",
      title: "A Detailed Movie",
      type: "movie",
      imageUrl: "https://image.tmdb.org/t/p/w500/movie.jpg",
      description: "A useful description.",
      genres: ["Drama", "Mystery"],
      runtimeMinutes: 127,
      catalogRating: 8.4,
      seasons: [],
    });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/3/movie/31");
    expect(url.searchParams.get("language")).toBe("en-US");
  });

  it("normalizes show seasons and filters specials and empty seasons", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 41,
        name: "A Detailed Show",
        adult: false,
        poster_path: null,
        overview: null,
        genres: [{ name: "Comedy" }],
        episode_run_time: [0, 48, 50],
        last_episode_to_air: { runtime: 55 },
        vote_average: null,
        seasons: [
          { season_number: 0, episode_count: 8 },
          { season_number: 1, episode_count: 10 },
          { season_number: 2, episode_count: 0 },
          { season_number: 3, episode_count: 12 },
        ],
      }),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        "season/1": {
          episodes: [{ runtime: 42 }, { runtime: 44 }],
        },
        "season/3": {
          episodes: [{ runtime: 46 }, { runtime: null }, { runtime: 0 }],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTmdbDetails("show", 41)).resolves.toEqual({
      id: "",
      source: "tmdb_tv",
      externalId: "41",
      title: "A Detailed Show",
      type: "show",
      imageUrl: null,
      description: null,
      genres: ["Comedy"],
      runtimeMinutes: 44,
      catalogRating: null,
      seasons: [
        { seasonNumber: 1, episodeCount: 10 },
        { seasonNumber: 3, episodeCount: 12 },
      ],
    });

    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(
      "/3/tv/41",
    );
    const runtimeUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(runtimeUrl.pathname).toBe("/3/tv/41");
    expect(runtimeUrl.searchParams.get("append_to_response")).toBe(
      "season/1,season/3",
    );
    expect(runtimeUrl.searchParams.get("language")).toBe("en-US");
  });

  it("batches runtime requests for shows with more than 20 seasons", async () => {
    const seasons = Array.from({ length: 21 }, (_, index) => ({
      season_number: index + 1,
      episode_count: 1,
    }));
    const firstBatch = Object.fromEntries(
      seasons
        .slice(0, 20)
        .map((season) => [
          `season/${season.season_number}`,
          { episodes: [{ runtime: 40 }] },
        ]),
    );

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 44,
          name: "Long-Running Show",
          adult: false,
          poster_path: null,
          overview: null,
          genres: [],
          episode_run_time: [],
          vote_average: null,
          seasons,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(firstBatch))
      .mockResolvedValueOnce(
        jsonResponse({
          "season/21": { episodes: [{ runtime: 61 }] },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTmdbDetails("show", 44)).resolves.toMatchObject({
      runtimeMinutes: 41,
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstRuntimeUrl = new URL(String(fetchMock.mock.calls[1][0]));
    const secondRuntimeUrl = new URL(String(fetchMock.mock.calls[2][0]));
    expect(
      firstRuntimeUrl.searchParams.get("append_to_response")?.split(","),
    ).toHaveLength(20);
    expect(secondRuntimeUrl.searchParams.get("append_to_response")).toBe(
      "season/21",
    );
  });

  it("falls back to the last aired episode runtime", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 42,
        name: "Show Without Series Runtime",
        adult: false,
        poster_path: null,
        overview: null,
        genres: [],
        episode_run_time: [],
        last_episode_to_air: { runtime: 46 },
        vote_average: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTmdbDetails("show", 42)).resolves.toMatchObject({
      runtimeMinutes: 46,
      seasons: [],
    });
  });

  it("normalizes missing optional show fields", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 43,
        name: "Sparse Show",
        adult: false,
        poster_path: null,
        overview: null,
        genres: [],
        episode_run_time: [],
        vote_average: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTmdbDetails("show", 43)).resolves.toMatchObject({
      runtimeMinutes: null,
      seasons: [],
    });
  });

  it("normalizes recommendations and filters adult results", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: 51,
            title: "Recommended Movie",
            adult: false,
            poster_path: "/recommended.jpg",
          },
          {
            id: 52,
            title: "Filtered Movie",
            adult: true,
            poster_path: null,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTmdbRecommendations("movie", 31)).resolves.toEqual([
      {
        id: "",
        source: "tmdb_movie",
        externalId: "51",
        title: "Recommended Movie",
        type: "movie",
        imageUrl: "https://image.tmdb.org/t/p/w500/recommended.jpg",
      },
    ]);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/3/movie/31/recommendations");
    expect(url.searchParams.get("page")).toBe("1");
  });

  it("returns an empty array when TMDB has no results", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchTmdb("nothing", "show")).resolves.toEqual([]);
  });

  it("retries once when the initial TMDB request fails at the network layer", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchTmdb("retry", "movie")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a sanitized error after both network attempts fail", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchTmdb("failure", "movie")).rejects.toMatchObject({
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "TMDB request failed",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["details", () => getTmdbDetails("movie", 999)],
    ["recommendations", () => getTmdbRecommendations("show", 999)],
  ])("returns the standard not-found error for missing %s", async (_, call) => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(call()).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "TMDB media not found",
    });
  });

  it("rejects malformed provider responses", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ results: [{ id: "invalid", title: 42 }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchTmdb("invalid", "movie")).rejects.toMatchObject({
      statusCode: 500,
      code: "INTERNAL_SERVER_ERROR",
      message: "TMDB returned an invalid response",
    });
  });

  it.each([401, 429, 500])(
    "sanitizes TMDB HTTP %s failures without exposing the token",
    async (status) => {
      fetchMock.mockResolvedValue(
        jsonResponse({ status_message: "No" }, status),
      );
      vi.stubGlobal("fetch", fetchMock);

      let caught: unknown;

      try {
        await searchTmdb("failure", "movie");
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(AppError);
      expect(caught).toMatchObject({
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "TMDB request failed",
      });
      expect(String(caught)).not.toContain(TEST_TOKEN);
      expect(JSON.stringify(caught)).not.toContain(TEST_TOKEN);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );
});
