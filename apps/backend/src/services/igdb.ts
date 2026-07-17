import { IgdbResponse, SourceMediaRecord } from "@media-voyage/shared/api";
import { getAccessToken } from "./twitchAuth";
import { formatDate } from "@media-voyage/shared/utilities";

export async function searchGames(query: string): Promise<SourceMediaRecord[]> {
  const token = await getAccessToken();

  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-ID": process.env.IGDB_CLIENT_ID!,
    },
    body: `
      fields id,name,cover.image_id,first_release_date;
      search "${query}";
      limit 10;
    `,
  });

  const data: IgdbResponse = await response.json();

  const records: SourceMediaRecord[] = data.map((val) => ({
    id: "",
    source: "igdb",
    externalId: String(val.id),
    title: val.name,
    type: "game",
    imageUrl: val.cover.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${val.cover.image_id}.jpg`
      : null,
    releaseDate: val.first_release_date ? formatDate(new Date(val.first_release_date * 1000)) : "",
  }));

  console.log(records);

  return records;
}
