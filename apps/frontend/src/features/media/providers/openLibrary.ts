import type { SourceMediaRecord } from "@media-voyage/shared/api";
import type { HydratedMedia } from "./hydrateMedia";

export function hydrateOpenLibrary(record: SourceMediaRecord): HydratedMedia {
  if (!record.genres?.length) return {};

  return {
    metadata: {
      genre: record.genres.slice(0, 5).join(", "),
    },
  };
}
