import { IgdbResponse, SourceMediaRecord } from "@media-voyage/shared/api";
import { getAccessToken } from "./twitchAuth";
import { env } from "../config";
import { internalServerError } from "../errors";

export async function searchGames(query: string): Promise<SourceMediaRecord[]> {
  const token = await getAccessToken();

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": env.IGDB_CLIENT_ID,
    },
    body: `
      fields id,name,cover.image_id,first_release_date;
      search "${query}";
      limit 10;
    `,
  });

  if (!response.ok) {
    throw internalServerError("IGDB request failed")
  }

  const data: IgdbResponse = await response.json();

  const records: SourceMediaRecord[] = data.map((val) => ({
    id: "",
    source: "igdb",
    externalId: String(val.id),
    title: val.name,
    type: "game",
    imageUrl: val.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${val.cover.image_id}.jpg`
      : null,
  }));

  return records;
}
