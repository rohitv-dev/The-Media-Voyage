import type {
  IgdbGame,
  IgdbRecord,
  IgdbResponse,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { getAccessToken } from "./twitchAuth";
import { env } from "../config";
import { internalServerError } from "../errors";

// Apicalypse has no parameterized-query support, so the search string must be
// escaped before interpolation to avoid breaking out of the `search "..."`
// clause and injecting arbitrary query statements.
function escapeApicalypseString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toGameRecord(game: IgdbRecord): SourceMediaRecord {
  return {
    id: "",
    source: "igdb",
    externalId: String(game.id),
    title: game.name,
    type: "game",
    imageUrl: game.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_1080p/${game.cover.image_id}.jpg`
      : null,
  };
}

async function fetchIgdb<T>(body: string): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": env.IGDB_CLIENT_ID,
    },
    body,
  });

  if (!response.ok) {
    throw internalServerError("IGDB request failed");
  }

  return response.json() as Promise<T>;
}

async function fetchIgdbSearch(query: string): Promise<IgdbResponse> {
  return fetchIgdb<IgdbResponse>(`
    fields id,name,cover.image_id;
    search "${escapeApicalypseString(query)}";
    limit 10;
  `);
}

// Occasionally returns an empty result for a query that succeeds moments
// later on an identical retry.
export async function searchGames(query: string): Promise<SourceMediaRecord[]> {
  let data = await fetchIgdbSearch(query);

  if (data.length === 0) {
    data = await fetchIgdbSearch(query);
  }

  const records = data.map(toGameRecord);

  return records;
}

export async function getGameDetails(
  externalId: string,
): Promise<IgdbGame | null> {
  const data = await fetchIgdb<IgdbGame[]>(`
    fields id,name,summary,genres.name,rating;
    where id = ${Number(externalId)};
  `);

  return data[0] ?? null;
}

export async function getGameRecommendations(
  externalId: string,
): Promise<SourceMediaRecord[]> {
  const data = await fetchIgdb<{ similar_games?: IgdbRecord[] }[]>(`
    fields similar_games.id,similar_games.name,similar_games.cover.image_id;
    where id = ${Number(externalId)};
    limit 1;
  `);

  return (data[0]?.similar_games ?? []).map(toGameRecord);
}
