import { IgdbGame, IgdbResponse, SourceMediaRecord } from "@media-voyage/shared/api";
import { getAccessToken } from "./twitchAuth";
import { env } from "../config";
import { internalServerError } from "../errors";

async function fetchIgdbSearch(query: string): Promise<IgdbResponse> {
  const token = await getAccessToken();

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": env.IGDB_CLIENT_ID,
    },
    body: `
      fields id,name,cover.image_id;
      search "${query}";
      limit 10;
    `,
  });

  if (!response.ok) {
    throw internalServerError("IGDB request failed")
  }

  return response.json();
}

// Occasionally returns an empty result for a query that succeeds moments
// later on an identical retry (same flakiness as OMDb's search endpoint).
export async function searchGames(query: string): Promise<SourceMediaRecord[]> {
  let data = await fetchIgdbSearch(query);

  if (data.length === 0) {
    data = await fetchIgdbSearch(query);
  }

  const records: SourceMediaRecord[] = data.map((val) => ({
    id: "",
    source: "igdb",
    externalId: String(val.id),
    title: val.name,
    type: "game",
    imageUrl: val.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_1080p/${val.cover.image_id}.jpg`
      : null,
  }));

  return records;
}

export async function getGameDetails(
  externalId: string,
): Promise<IgdbGame | null> {
  const token = await getAccessToken();

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": env.IGDB_CLIENT_ID,
    },
    body: `
      fields id,name,summary,genres.name,rating;
      where id = ${Number(externalId)};
    `,
  });

  if (!response.ok) {
    throw internalServerError("IGDB request failed");
  }

  const data: IgdbGame[] = await response.json();

  return data[0] ?? null;
}
