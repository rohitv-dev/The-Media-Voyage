import type {
  SeasonProgressEntry,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { hydrateIgdb } from "./igdb";
import { hydrateOmdb } from "./omdb";
import { hydrateOpenLibrary } from "./openLibrary";
import { hydrateTvMaze } from "./tvmaze";

export type HydratedMedia = {
  description?: string;
  metadata?: Record<string, string>;
  seasonsProgress?: SeasonProgressEntry[];
};

export async function hydrateMediaRecord(
  record: SourceMediaRecord,
): Promise<HydratedMedia> {
  switch (record.source) {
    case "omdb":
      return hydrateOmdb(record);
    case "igdb":
      return hydrateIgdb(record);
    case "open_library":
      return hydrateOpenLibrary(record);
    case "tvmaze":
      return hydrateTvMaze(record);
    default:
      return {};
  }
}
