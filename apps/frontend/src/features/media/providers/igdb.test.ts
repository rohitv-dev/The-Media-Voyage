import type { IgdbGame, SourceMediaRecord } from "@media-voyage/shared/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hydrateIgdb } from "./igdb";

const apiMock = vi.hoisted(() => vi.fn());

vi.mock("#/lib/api", () => ({ api: apiMock }));

const record: SourceMediaRecord = {
  id: "",
  source: "igdb",
  externalId: "100",
  title: "Semantic Game",
  type: "game",
  imageUrl: null,
};

describe("IGDB frontend hydration", () => {
  beforeEach(() => apiMock.mockReset());

  it("persists normalized semantic metadata from details", async () => {
    const details: IgdbGame = {
      id: 100,
      name: "Semantic Game",
      summary: "An adventure.",
      genres: [{ id: 1, name: "RPG" }],
      themes: ["Dark fantasy"],
      keywords: ["boss battles", "medieval"],
      gameModes: ["Single player"],
      playerPerspectives: ["Third person"],
      rating: 89.4,
    };
    apiMock.mockResolvedValue(details);

    await expect(hydrateIgdb(record)).resolves.toEqual({
      description: "An adventure.",
      metadata: {
        genre: ["RPG"],
        themes: ["Dark fantasy"],
        keywords: ["boss battles", "medieval"],
        gameModes: ["Single player"],
        playerPerspectives: ["Third person"],
        catalogRating: 8.9,
      },
    });
    expect(apiMock).toHaveBeenCalledWith("/media/igdb/100");
  });
});
