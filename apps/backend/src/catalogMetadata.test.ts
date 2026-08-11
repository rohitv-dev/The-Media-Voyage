import { describe, expect, it } from "vitest";
import {
  MAX_CATALOG_METADATA_TERMS,
  normalizeCatalogTerms,
} from "@media-voyage/shared/catalogMetadata";

describe("normalizeCatalogTerms", () => {
  it("trims, deduplicates, drops empty values, and caps terms", () => {
    const values = [
      " First ",
      "first",
      "",
      "   ",
      ...Array.from(
        { length: MAX_CATALOG_METADATA_TERMS + 1 },
        (_, index) => `Term ${index + 1}`,
      ),
    ];

    expect(normalizeCatalogTerms(values)).toEqual([
      "First",
      ...Array.from(
        { length: MAX_CATALOG_METADATA_TERMS - 1 },
        (_, index) => `Term ${index + 1}`,
      ),
    ]);
  });

  it("returns undefined when no usable terms remain", () => {
    expect(normalizeCatalogTerms(["", "  "])).toBeUndefined();
    expect(normalizeCatalogTerms(undefined)).toBeUndefined();
  });
});
