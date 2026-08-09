import type {
  SeasonProgressEntry,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { hydrateIgdb } from "./igdb";
import { hydrateOpenLibrary } from "./openLibrary";
import { hydrateTmdb } from "./tmdb";
import type { CatalogMetadata } from "../catalogMetadata";

export type HydratedMedia = {
  description?: string;
  metadata?: CatalogMetadata;
  seasonsProgress?: SeasonProgressEntry[];
};

export async function hydrateMediaRecord(
  record: SourceMediaRecord,
): Promise<HydratedMedia> {
  switch (record.source) {
    case "tmdb_movie":
    case "tmdb_tv":
      return hydrateTmdb(record);
    case "igdb":
      return hydrateIgdb(record);
    case "open_library":
      return hydrateOpenLibrary(record);
    default:
      return {};
  }
}
