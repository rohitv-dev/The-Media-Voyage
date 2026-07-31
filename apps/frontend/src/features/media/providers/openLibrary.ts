import type { SourceMediaRecord } from "@media-voyage/shared/api";
import type { HydratedMedia } from "./hydrateMedia";
import type { CatalogMetadata } from "@media-voyage/shared";

export function hydrateOpenLibrary(record: SourceMediaRecord): HydratedMedia {
  const metadata: CatalogMetadata<"book"> = {};

  if (record.numberOfPages) {
    metadata.numberOfPages = record.numberOfPages;
  }

  if (record.genres?.length) {
    metadata.genre = record.genres.slice(0, 5).join(", ");
  }

  if (!Object.keys(metadata).length) return {};

  return {
    metadata,
  };
}
