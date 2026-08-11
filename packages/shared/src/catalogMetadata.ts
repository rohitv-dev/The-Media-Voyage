export const MAX_CATALOG_METADATA_TERMS = 20;

export function normalizeCatalogTerms(
  values: readonly string[] | null | undefined,
): string[] | undefined {
  if (!values?.length) return undefined;

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(trimmed);

    if (normalized.length === MAX_CATALOG_METADATA_TERMS) break;
  }

  return normalized.length ? normalized : undefined;
}
