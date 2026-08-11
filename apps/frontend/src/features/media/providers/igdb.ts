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
  const metadata: CatalogMetadata<"game"> = {};

  if (details?.genres?.length) {
    metadata.genre = details.genres.map((genre) => genre.name);
  }

  if (details?.themes?.length) metadata.themes = details.themes;
  if (details?.keywords?.length) metadata.keywords = details.keywords;
  if (details?.gameModes?.length) metadata.gameModes = details.gameModes;
  if (details?.playerPerspectives?.length) {
    metadata.playerPerspectives = details.playerPerspectives;
  }

  if (details?.rating) {
    metadata.catalogRating = Number((details.rating / 10).toFixed(1));
  }

  return {
    description: details?.summary,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
