import type { CatalogMetadata } from "@media-voyage/shared";
import type {
  IgdbGame,
  OmdbMovie,
  TvMazeDetails,
} from "@media-voyage/shared/api";
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

const namedHtmlEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
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

export function stripTvMazeHtml(value: string): string | undefined {
  const withoutTags = value.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags.replace(
    /&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
    (entity, encoded: string) => {
      const lowerCase = encoded.toLowerCase();

      if (lowerCase.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(lowerCase.slice(2), 16));
      }

      if (lowerCase.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(lowerCase.slice(1), 10));
      }

      return namedHtmlEntities[lowerCase] ?? entity;
    },
  );

  return nonEmpty(decoded.replace(/\s+/g, " ").replace(/\s+([,.:;!?])/g, "$1"));
}

export function refreshOmdb(details: OmdbMovie | null): CatalogRefresh {
  const metadata: CatalogMetadata<"movie"> = {};

  if (details?.Genre) metadata.genre = details.Genre;
  if (details?.Runtime) metadata.runtime = details.Runtime;
  if (details?.imdbRating && details.imdbRating !== "N/A") {
    metadata.catalogRating = `${details.imdbRating}/10`;
  }

  return {
    description: nonEmpty(details?.Plot),
    metadata: metadataOrUndefined(metadata),
  };
}

export function refreshIgdb(details: IgdbGame | null): CatalogRefresh {
  const metadata: CatalogMetadata<"game"> = {};

  if (details?.genres?.length) {
    metadata.genre = details.genres.map((genre) => genre.name).join(", ");
  }
  if (details?.rating) {
    metadata.catalogRating = `${(details.rating / 10).toFixed(1)}/10`;
  }

  return {
    description: nonEmpty(details?.summary),
    metadata: metadataOrUndefined(metadata),
  };
}

export function refreshTvMaze(details: TvMazeDetails | null): CatalogRefresh {
  const metadata: CatalogMetadata<"show"> = {};
  const runtime = details?.averageRuntime ?? details?.runtime;

  if (details?.genres.length) metadata.genre = details.genres.join(", ");
  if (runtime !== null && runtime !== undefined)
    metadata.runtime = `${runtime} min`;
  if (
    details?.rating.average !== null &&
    details?.rating.average !== undefined
  ) {
    metadata.catalogRating = `${details.rating.average}/10`;
  }

  return {
    description: details?.summary
      ? stripTvMazeHtml(details.summary)
      : undefined,
    metadata: metadataOrUndefined(metadata),
  };
}

export function refreshOpenLibrary(
  details: OpenLibraryDetails | null,
): CatalogRefresh {
  const metadata: CatalogMetadata<"book"> = {};

  if (details?.genres?.length)
    metadata.genre = details.genres.slice(0, 5).join(", ");
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
  const metadataChanged =
    refreshed.metadata !== undefined &&
    JSON.stringify(existing.metadata) !== JSON.stringify(refreshed.metadata);
  const descriptionChanged =
    refreshed.description !== undefined &&
    existing.description !== refreshed.description;

  return {
    ...(metadataChanged ? { metadata: refreshed.metadata } : {}),
    ...(descriptionChanged ? { description: refreshed.description } : {}),
  };
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
