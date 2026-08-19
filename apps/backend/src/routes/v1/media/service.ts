import { db } from "@/db/db";
import { searchGames } from "@/services/igdb";
import { searchOpenLibrary } from "@/services/openLibrary";
import { searchTmdb } from "@/services/tmdb";
import { media } from "@media-voyage/shared";
import type {
  MediaSearchQuery,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { and, eq, ilike } from "drizzle-orm";

const mediaSearchSelect = {
  id: media.id,
  title: media.title,
  imageUrl: media.imageUrl,
  type: media.type,
  source: media.source,
  externalId: media.externalId,
};

function searchLocalMedia({ q, type }: MediaSearchQuery) {
  return db
    .select(mediaSearchSelect)
    .from(media)
    .where(and(ilike(media.title, `%${q}%`), eq(media.type, type)))
    .limit(10);
}

export async function searchMedia(
  query: MediaSearchQuery,
): Promise<SourceMediaRecord[]> {
  const localResults = await searchLocalMedia(query);
  const localRecords: SourceMediaRecord[] = localResults.map((record) => ({
    id: record.id,
    source: record.source ?? "db",
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
    case "show":
      externalRecords = await searchTmdb(query.q, query.type);
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
