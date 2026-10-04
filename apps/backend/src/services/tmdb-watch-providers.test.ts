import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WATCH_PROVIDER_CACHE_TTL_MS } from "@media-voyage/shared/api";

const fetchMock = vi.fn();
vi.mock("../config", () => ({
  env: { TMDB_API_READ_ACCESS_TOKEN: "test-only-tmdb-token" },
}));

let tmdb: typeof import("./tmdb");
const now = new Date("2026-10-04T00:00:00Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function provider(id: number, name: string, priority = 0) {
  return {
    provider_id: id,
    provider_name: name,
    logo_path: "/" + id + ".jpg",
    display_priority: priority,
  };
}

function availability(id = 101) {
  return {
    id,
    results: {
      IN: {
        link: "https://www.themoviedb.org/movie/" + id + "/watch?locale=IN",
        flatrate: [provider(1, "Netflix", 8), provider(2, "Prime Video", 2)],
        free: [provider(3, "Free service")],
        ads: [provider(4, "Ad service")],
        rent: [provider(5, "Rental service")],
        buy: [provider(6, "Purchase service")],
      },
      US: { free: [provider(7, "US service")] },
    },
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  tmdb = await import("./tmdb");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("TMDB watch availability", () => {
  it("shares one in-flight lookup across countries and normalizes all offer types", async () => {
    fetchMock.mockResolvedValue(jsonResponse(availability()));
    const [india, us] = await Promise.all([
      tmdb.getTmdbWatchProviders("movie", 101, "IN"),
      tmdb.getTmdbWatchProviders("movie", 101, "US"),
    ]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe("/3/movie/101/watch/providers");
    expect(options.headers.Authorization).toBe("Bearer test-only-tmdb-token");
    expect(india.offers.flatrate.map((item) => item.name)).toEqual([
      "Prime Video",
      "Netflix",
    ]);
    expect(india.offers.flatrate[0]).toEqual({
      id: 2,
      name: "Prime Video",
      logoUrl: "https://image.tmdb.org/t/p/w92/2.jpg",
      displayPriority: 2,
    });
    expect(india.offers.free[0].name).toBe("Free service");
    expect(india.offers.ads[0].name).toBe("Ad service");
    expect(india.offers.rent[0].name).toBe("Rental service");
    expect(india.offers.buy[0].name).toBe("Purchase service");
    expect(india.link).toContain("locale=IN");
    expect(india.expiresAt).toBe("2026-10-05T00:00:00.000Z");
    expect(us.country).toBe("US");
    expect(us.link).toBeNull();
    expect(us.offers.free[0].name).toBe("US service");
    expect(us.offers.flatrate).toEqual([]);
  });

  it("keeps movie and show IDs separate", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(availability()));
    await tmdb.getTmdbWatchProviders("movie", 101, "IN");
    await tmdb.getTmdbWatchProviders("show", 101, "IN");
    expect(fetchMock.mock.calls.map(([url]) => url.pathname)).toEqual([
      "/3/movie/101/watch/providers",
      "/3/tv/101/watch/providers",
    ]);
  });

  it("refreshes at 24 hours and does not extend expiry on cache hits", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(availability()));
    const first = await tmdb.getTmdbWatchProviders("movie", 101, "IN");
    vi.setSystemTime(now.getTime() + WATCH_PROVIDER_CACHE_TTL_MS - 1);
    const cached = await tmdb.getTmdbWatchProviders("movie", 101, "US");
    expect(cached.expiresAt).toBe(first.expiresAt);
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.setSystemTime(now.getTime() + WATCH_PROVIDER_CACHE_TTL_MS);
    const refreshed = await tmdb.getTmdbWatchProviders("movie", 101, "IN");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(refreshed.expiresAt).toBe("2026-10-06T00:00:00.000Z");
  });

  it("rejects unsafe watch links without caching the response", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 101,
          results: { IN: { link: "javascript:alert(1)" } },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(availability()));
    await expect(
      tmdb.getTmdbWatchProviders("movie", 101, "IN"),
    ).rejects.toMatchObject({ statusCode: 500 });
    await expect(
      tmdb.getTmdbWatchProviders("movie", 101, "IN"),
    ).resolves.toHaveProperty("country", "IN");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps provider failures distinct from successful empty responses", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ id: 101, results: {} }));
    await expect(
      tmdb.getTmdbWatchProviders("movie", 101, "IN"),
    ).rejects.toMatchObject({ statusCode: 500 });
    const result = await tmdb.getTmdbWatchProviders("movie", 101, "IN");
    expect(result.offers.flatrate).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("TMDB watch countries", () => {
  it("sorts, shares, and expires the country list", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({
        results: [
          { iso_3166_1: "US", english_name: "United States" },
          { iso_3166_1: "IN", english_name: "India" },
        ],
      }),
    );
    const [first, second] = await Promise.all([
      tmdb.getTmdbWatchRegions(),
      tmdb.getTmdbWatchRegions(),
    ]);
    expect(first).toEqual([
      { code: "IN", name: "India" },
      { code: "US", name: "United States" },
    ]);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0].pathname).toBe(
      "/3/watch/providers/regions",
    );
    vi.setSystemTime(now.getTime() + WATCH_PROVIDER_CACHE_TTL_MS);
    await tmdb.getTmdbWatchRegions();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
