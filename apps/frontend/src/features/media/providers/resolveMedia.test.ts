import type {
  ResolvedCatalogMedia,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMediaSelection } from "./resolveMedia";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("#/lib/api", () => ({ api: apiMock }));

const providerRecord: SourceMediaRecord = {
  id: "",
  source: "tmdb_tv",
  externalId: "100",
  title: "Untrusted title",
  type: "show",
  imageUrl: null,
};

describe("provider media resolution", () => {
  beforeEach(() => {
    apiMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T12:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("hydrates the add form and retains the resolved canonical media ID", async () => {
    const resolved: ResolvedCatalogMedia = {
      id: "11111111-1111-4111-8111-111111111111",
      source: "tmdb_tv",
      externalId: "100",
      title: "Canonical Show",
      type: "show",
      imageUrl: "https://image.test/show.jpg",
      description: "Canonical description.",
      metadata: { genre: ["Drama"], runtime: 45 },
      seasons: [{ seasonNumber: 1, episodeCount: 10 }],
    };
    apiMock.mockResolvedValue(resolved);

    await expect(resolveMediaSelection(providerRecord)).resolves.toEqual({
      record: {
        id: resolved.id,
        source: "tmdb_tv",
        externalId: "100",
        title: "Canonical Show",
        type: "show",
        imageUrl: "https://image.test/show.jpg",
      },
      description: "Canonical description.",
      metadata: { genre: ["Drama"], runtime: 45 },
      seasonsProgress: [
        {
          season: 1,
          expectedEpisodeCount: 10,
          status: "planned",
          episodesWatched: 0,
          updatedAt: "2026-08-12T12:00:00.000Z",
        },
      ],
    });
    expect(apiMock).toHaveBeenCalledWith("/media/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "tmdb_tv", externalId: "100" }),
    });
  });

  it("does not resolve existing database or manual selections", async () => {
    const databaseRecord: SourceMediaRecord = {
      ...providerRecord,
      id: "11111111-1111-4111-8111-111111111111",
      source: "db",
    };

    await expect(resolveMediaSelection(databaseRecord)).resolves.toEqual({
      record: databaseRecord,
    });
    expect(apiMock).not.toHaveBeenCalled();
  });
});
