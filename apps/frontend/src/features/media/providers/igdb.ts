import type { IgdbGame, SourceMediaRecord } from "@media-voyage/shared/api";
import { api } from "#/lib/api";
import type { CatalogMetadata } from "../catalogMetadata";
import type { HydratedMedia } from "./hydrateMedia";

export async function hydrateIgdb(
  record: SourceMediaRecord,
): Promise<HydratedMedia> {
  if (!record.externalId) return {};

  const details = await api<IgdbGame | null>(
    `/media/igdb/${record.externalId}`,
  );
  const metadata: CatalogMetadata = {};

  if (details?.genres?.length) {
    metadata.genre = details.genres.map((genre) => genre.name).join(", ");
  }

  if (details?.rating) {
    metadata.catalogRating = `${(details.rating / 10).toFixed(1)}/10`;
  }

  return {
    description: details?.summary,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
