import type { SeasonProgressEntry } from "@media-voyage/shared/api";

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
