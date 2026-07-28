import type { OmdbMovie, SourceMediaRecord } from "@media-voyage/shared/api";
import { api } from "#/lib/api";
import type { HydratedMedia } from "./hydrateMedia";

export async function hydrateOmdb(
  record: SourceMediaRecord,
): Promise<HydratedMedia> {
  if (!record.externalId) return {};

  const details = await api<OmdbMovie | null>(
    `/media/omdb/${record.externalId}`,
  );
  if (!details) return {};
  const metadata: Record<string, string> = {};

  if (details.Genre) {
    metadata.genre = details.Genre;
  }

  if (details.Runtime && record.type !== "show") {
    metadata.runtime = details.Runtime;
  }

  if (details.imdbRating && details.imdbRating !== "N/A") {
    metadata.catalogRating = `${details.imdbRating}/10`;
  }

  return {
    description: details.Plot,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
