import type {
  MediaSearchQuery,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { searchGames } from "../../../services/igdb";
import { searchOmdb } from "../../../services/omdb";
import { searchLocalMedia } from "./queries";

export async function searchMedia(
  query: MediaSearchQuery,
): Promise<SourceMediaRecord[]> {
  const localResults = await searchLocalMedia(query);
  const localRecords: SourceMediaRecord[] = localResults.map((record) => ({
    id: record.id,
    source: "db",
    title: record.title,
    imageUrl: record.imageUrl,
    type: record.type,
    externalId: record.externalId,
    releaseDate: record.releaseDate ?? "",
  }));

  if (localRecords.length >= 10) {
    return localRecords;
  }

  let externalRecords: SourceMediaRecord[] = [];

  switch (query.type) {
    case "movie":
    case "show":
      externalRecords = await searchOmdb(query.q);
      break;
    case "game":
      externalRecords = await searchGames(query.q);
      break;
  }

  return [...localRecords, ...externalRecords];
}
