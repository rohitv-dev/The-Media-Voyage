import type {
  MediaSearchQuery,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { searchGames } from "../../../services/igdb";
import { searchOmdb } from "../../../services/omdb";
import { searchOpenLibrary } from "../../../services/openLibrary";
import { searchTvMaze } from "../../../services/tvMaze";
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
  }));

  if (localRecords.length >= 10) {
    return localRecords;
  }

  let externalRecords: SourceMediaRecord[] = [];

  switch (query.type) {
    case "movie":
      externalRecords = await searchOmdb(query.q);
      break;
    case "show":
      externalRecords = await searchTvMaze(query.q);
      break;
    case "game":
      externalRecords = await searchGames(query.q);
      break;
    case "book":
      externalRecords = await searchOpenLibrary(query.q);
      break;
  }

  const localExternalIds = new Set(
    localRecords.map((record) => record.externalId).filter(Boolean),
  );
  const dedupedExternalRecords = externalRecords.filter(
    (record) => !localExternalIds.has(record.externalId),
  );

  return [...localRecords, ...dedupedExternalRecords];
}
