import type { CatalogMetadata } from "@media-voyage/shared";
import type {
  SeasonProgressEntry,
  UserMediaFormSchema,
} from "@media-voyage/shared/api";

type NumericInput = number | string | null | undefined;

function toFiniteNumber(value: NumericInput) {
  if (value === "" || value === null || value === undefined) return undefined;

  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

export function normalizeProgress(value: NumericInput) {
  return toFiniteNumber(value) ?? 0;
}

export function normalizeNullableNumber(value: NumericInput) {
  return toFiniteNumber(value) ?? null;
}

export function normalizeTimeSpent(value: NumericInput) {
  const numericValue = toFiniteNumber(value);
  return numericValue && numericValue > 0 ? numericValue : null;
}

export function hasDuplicateSeasonNumbers(
  seasons: Array<Pick<SeasonProgressEntry, "season">> | undefined,
) {
  const seen = new Set<number>();

  return (seasons ?? []).some(({ season }) => {
    if (seen.has(season)) return true;

    seen.add(season);
    return false;
  });
}

export function getCatalogRuntimeMinutes(metadata?: CatalogMetadata) {
  if (!metadata || !("runtime" in metadata)) return undefined;
  return metadata.runtime && metadata.runtime > 0
    ? metadata.runtime
    : undefined;
}

export function getEstimatedTimeSpentMinutes(
  type: UserMediaFormSchema["type"],
  metadata?: CatalogMetadata,
  seasonsProgress: SeasonProgressEntry[] = [],
) {
  const runtimeMinutes = getCatalogRuntimeMinutes(metadata);

  if (type === "movie") return runtimeMinutes;
  if (type !== "show" || !runtimeMinutes) return undefined;

  const totalEpisodesWatched = seasonsProgress.reduce(
    (total, season) => total + (season.episodesWatched ?? 0),
    0,
  );

  return totalEpisodesWatched
    ? Math.round(totalEpisodesWatched * runtimeMinutes)
    : undefined;
}

export function getBookPageCount(catalogMetadata?: CatalogMetadata<"book">) {
  const { numberOfPages } = catalogMetadata ?? {};
  return typeof numberOfPages === "number" && numberOfPages > 0
    ? numberOfPages
    : undefined;
}
