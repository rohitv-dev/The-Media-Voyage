import type { SourceMediaRecord } from "@media-voyage/shared/api";
import { normalizeCatalogTerms } from "@media-voyage/shared/catalogMetadata";
import type { HydratedMedia } from "./hydrateMedia";
import type { CatalogMetadata } from "@media-voyage/shared";

export function hydrateOpenLibrary(record: SourceMediaRecord): HydratedMedia {
  const metadata: CatalogMetadata<"book"> = {};

  if (record.numberOfPages) {
    metadata.numberOfPages = record.numberOfPages;
  }

  if (record.genres?.length) {
    metadata.genre = record.genres.slice(0, 5);
  }

  const subjects = normalizeCatalogTerms(record.genres);
  if (subjects) metadata.subjects = subjects;

  if (!Object.keys(metadata).length) return {};

  return {
    metadata,
  };
}
