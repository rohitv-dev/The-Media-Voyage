import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAccessTokenMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
}));

vi.mock("./twitchAuth", () => ({
  getAccessToken: getAccessTokenMock,
}));

vi.mock("../config", () => ({
  env: { IGDB_CLIENT_ID: "client-id" },
}));

import { getGameDetails, getGameRecommendations } from "./igdb";

const fetchMock = vi.fn();

describe("getGameRecommendations", () => {
  beforeEach(() => {
    getAccessTokenMock.mockReset();
    getAccessTokenMock.mockResolvedValue("access-token");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and normalizes the seed's similar games", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            similar_games: [
              {
                id: 101,
                name: "Similar Game",
                cover: { id: 1, image_id: "cover-id" },
              },
              { id: 102, name: "No Cover" },
            ],
          },
        ]),
        { status: 200 },
      ),
    );

    await expect(getGameRecommendations("100")).resolves.toEqual([
      {
        id: "",
        source: "igdb",
        externalId: "101",
        title: "Similar Game",
        type: "game",
        imageUrl:
          "https://images.igdb.com/igdb/image/upload/t_1080p/cover-id.jpg",
      },
      {
        id: "",
        source: "igdb",
        externalId: "102",
        title: "No Cover",
        type: "game",
        imageUrl: null,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.igdb.com/v4/games",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Client-ID": "client-id",
        },
      }),
    );
    const request = fetchMock.mock.calls[0][1];
    expect(request.body).toContain(
      "fields similar_games.id,similar_games.name,similar_games.cover.image_id;",
    );
    expect(request.body).toContain("where id = 100;");
  });

  it("returns an empty list when IGDB has no similar games", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ id: 100 }]), { status: 200 }),
    );

    await expect(getGameRecommendations("100")).resolves.toEqual([]);
  });

  it("uses the sanitized provider error for failed responses", async () => {
    fetchMock.mockResolvedValue(
      new Response("private provider response", { status: 500 }),
    );

    await expect(getGameRecommendations("100")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "IGDB request failed",
    });
  });
});

describe("getGameDetails", () => {
  beforeEach(() => {
    getAccessTokenMock.mockReset();
    getAccessTokenMock.mockResolvedValue("access-token");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps semantic game metadata and normalizes its terms", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 100,
            name: "Semantic Game",
            summary: "An adventure.",
            genres: [{ id: 2, name: "RPG" }],
            rating: 89.4,
            themes: [{ id: 1, name: "Dark fantasy" }],
            keywords: [
              { id: 2, name: " boss battles " },
              { id: 3, name: "Boss Battles" },
              { id: 4, name: "medieval" },
            ],
            game_modes: [{ id: 5, name: "Single player" }],
            player_perspectives: [{ id: 6, name: "Third person" }],
          },
        ]),
        { status: 200 },
      ),
    );

    await expect(getGameDetails("100")).resolves.toEqual({
      id: 100,
      name: "Semantic Game",
      summary: "An adventure.",
      genres: [{ id: 2, name: "RPG" }],
      rating: 89.4,
      themes: ["Dark fantasy"],
      keywords: ["boss battles", "medieval"],
      gameModes: ["Single player"],
      playerPerspectives: ["Third person"],
    });

    const request = fetchMock.mock.calls[0][1];
    expect(request.body).toContain("themes.name");
    expect(request.body).toContain("keywords.name");
    expect(request.body).toContain("game_modes.name");
    expect(request.body).toContain("player_perspectives.name");
  });

  it("returns null when IGDB has no matching game", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));

    await expect(getGameDetails("100")).resolves.toBeNull();
  });
});
