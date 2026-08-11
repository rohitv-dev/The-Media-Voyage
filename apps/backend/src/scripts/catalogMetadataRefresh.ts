import type { CatalogMetadata } from "@media-voyage/shared";
import type { IgdbGame, TmdbMediaDetails } from "@media-voyage/shared/api";
import type { OpenLibraryDetails } from "@/services/openLibrary";

export type CatalogRefresh = {
  description?: string;
  metadata?: CatalogMetadata;
};

export type CatalogRefreshMode = "dry-run" | "apply";

type ExistingCatalogValues = {
  description: string | null;
  metadata: CatalogMetadata;
};

function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function metadataOrUndefined(
  metadata: CatalogMetadata,
): CatalogMetadata | undefined {
  return Object.keys(metadata).length ? metadata : undefined;
}

export function refreshIgdb(details: IgdbGame | null): CatalogRefresh {
  const metadata: CatalogMetadata<"game"> = {};

  if (details?.genres?.length) {
    metadata.genre = details.genres.map((genre) => genre.name);
  }
  if (details?.rating) {
    metadata.catalogRating = Number((details.rating / 10).toFixed(1));
  }

  if (details?.themes?.length) metadata.themes = details.themes;
  if (details?.keywords?.length) metadata.keywords = details.keywords;
  if (details?.gameModes?.length) metadata.gameModes = details.gameModes;
  if (details?.playerPerspectives?.length) {
    metadata.playerPerspectives = details.playerPerspectives;
  }

  return {
    description: nonEmpty(details?.summary),
    metadata: metadataOrUndefined(metadata),
  };
}

export function refreshTmdb(details: TmdbMediaDetails | null): CatalogRefresh {
  const metadata: CatalogMetadata<"movie" | "show"> = {};

  if (details?.genres.length) metadata.genre = details.genres;
  if (details?.keywords?.length) metadata.keywords = details.keywords;
  if (details?.runtimeMinutes) {
    metadata.runtime = details.runtimeMinutes;
  }
  if (details?.catalogRating !== null && details?.catalogRating !== undefined) {
    metadata.catalogRating = details.catalogRating;
  }

  return {
    description: nonEmpty(details?.description),
    metadata: metadataOrUndefined(metadata),
  };
}

export function refreshOpenLibrary(
  details: OpenLibraryDetails | null,
): CatalogRefresh {
  const metadata: CatalogMetadata<"book"> = {};

  if (details?.genres?.length) metadata.genre = details.genres.slice(0, 5);
  if (details?.subjects?.length) metadata.subjects = details.subjects;
  if (details?.numberOfPages) metadata.numberOfPages = details.numberOfPages;

  return {
    description: nonEmpty(details?.description),
    metadata: metadataOrUndefined(metadata),
  };
}

export function getCatalogRefreshChanges(
  existing: ExistingCatalogValues,
  refreshed: CatalogRefresh,
): CatalogRefresh {
  const metadata = refreshed.metadata
    ? mergeCatalogMetadata(existing.metadata, refreshed.metadata)
    : undefined;
  const metadataChanged =
    metadata !== undefined &&
    JSON.stringify(existing.metadata) !== JSON.stringify(metadata);
  const descriptionChanged =
    refreshed.description !== undefined &&
    existing.description !== refreshed.description;

  return {
    ...(metadataChanged ? { metadata } : {}),
    ...(descriptionChanged ? { description: refreshed.description } : {}),
  };
}

function hasUsableMetadataValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function mergeCatalogMetadata(
  existing: CatalogMetadata,
  refreshed: CatalogMetadata,
): CatalogMetadata {
  const merged = { ...existing } as Record<string, unknown>;

  for (const [key, value] of Object.entries(refreshed)) {
    if (hasUsableMetadataValue(value)) {
      merged[key] = value;
    }
  }

  return merged as CatalogMetadata;
}

export async function applyCatalogRefresh(
  mode: CatalogRefreshMode,
  existing: ExistingCatalogValues,
  refreshed: CatalogRefresh,
  writeChanges: (changes: CatalogRefresh) => Promise<void>,
): Promise<"updated" | "unchanged"> {
  const changes = getCatalogRefreshChanges(existing, refreshed);
  if (!changes.metadata && !changes.description) return "unchanged";

  if (mode === "apply") {
    await writeChanges(changes);
  }

  return "updated";
}
