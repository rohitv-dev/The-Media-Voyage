import { describe, expect, it } from "vitest";
import {
  mediaCollectionFormSchema,
  mediaCollectionUpdateSchema,
  mediaDetailsParamsSchema,
  mediaImageFocusSchema,
  reorderMediaCollectionItemsSchema,
  semanticSearchQuerySchema,
  userMediaFormSchema,
  userMediaPatchSchema,
  userMediaQuerySchema,
} from "@media-voyage/shared/api";

describe("user-media request schemas", () => {
  it("requires a bounded, meaningful semantic search query", () => {
    expect(
      semanticSearchQuerySchema.safeParse({ q: "four" }).success,
    ).toBe(false);
    expect(
      semanticSearchQuerySchema.safeParse({ q: "space" }).success,
    ).toBe(true);
    expect(
      semanticSearchQuerySchema.safeParse({ q: "a".repeat(501) }).success,
    ).toBe(false);
    expect(
      semanticSearchQuerySchema.safeParse({
        q: "  atmospheric space horror  ",
      }),
    ).toMatchObject({ success: true, data: { q: "atmospheric space horror" } });
  });

  it("keeps canonical media fields required for POST", () => {
    expect(userMediaFormSchema.safeParse({ title: "Dune" }).success).toBe(
      false,
    );
    expect(
      userMediaFormSchema.safeParse({ title: "Dune", type: "movie" }).success,
    ).toBe(true);
  });

  it("accepts only known canonical media sources", () => {
    expect(
      userMediaFormSchema.safeParse({
        title: "Dune",
        type: "movie",
        mediaSource: "tmdb_movie",
      }).success,
    ).toBe(true);
    expect(
      userMediaFormSchema.safeParse({
        title: "Dune",
        type: "movie",
        mediaSource: "unknown",
      }).success,
    ).toBe(false);
  });

  it("accepts a single tracking field for PATCH", () => {
    expect(userMediaPatchSchema.parse({ progress: 42 })).toEqual({
      progress: 42,
    });
  });

  it("accepts nullable clears for tracking fields", () => {
    expect(
      userMediaPatchSchema.parse({
        source: null,
        tags: null,
        rating: null,
        review: null,
        notes: null,
        timeSpent: null,
        pagesRead: null,
        startedAt: null,
        completedAt: null,
      }),
    ).toEqual({
      source: null,
      tags: null,
      rating: null,
      review: null,
      notes: null,
      timeSpent: null,
      pagesRead: null,
      startedAt: null,
      completedAt: null,
    });
    expect(userMediaPatchSchema.parse({ tags: [] })).toEqual({ tags: [] });
  });

  it("rejects empty and creation-only PATCH payloads", () => {
    expect(userMediaPatchSchema.safeParse({}).success).toBe(false);
    expect(
      userMediaPatchSchema.safeParse({
        title: "Dune",
        type: "movie",
        mediaId: "media-id",
      }).success,
    ).toBe(false);
  });

  it("does not include rewatches in parsed create or patch data", () => {
    const createResult = userMediaFormSchema.parse({
      title: "Dune",
      type: "movie",
      rewatches: 3,
    });
    const patchResult = userMediaPatchSchema.parse({
      progress: 42,
      rewatches: 3,
    });

    expect(createResult).not.toHaveProperty("rewatches");
    expect(patchResult).toEqual({ progress: 42 });
  });

  it("accepts only paired, normalized image-focus coordinates", () => {
    expect(
      mediaImageFocusSchema.parse({ imageFocusX: 0, imageFocusY: 1 }),
    ).toEqual({ imageFocusX: 0, imageFocusY: 1 });
    expect(
      mediaImageFocusSchema.parse({ imageFocusX: null, imageFocusY: null }),
    ).toEqual({ imageFocusX: null, imageFocusY: null });
    expect(
      mediaImageFocusSchema.safeParse({ imageFocusX: 0.5, imageFocusY: null })
        .success,
    ).toBe(false);
    expect(
      mediaImageFocusSchema.safeParse({ imageFocusX: -0.1, imageFocusY: 0.5 })
        .success,
    ).toBe(false);
    expect(
      mediaImageFocusSchema.safeParse({ imageFocusX: 0.5, imageFocusY: 1.1 })
        .success,
    ).toBe(false);
  });

  it("parses filter booleans explicitly", () => {
    expect(userMediaQuerySchema.parse({ favorite: "true" }).favorite).toBe(
      true,
    );
    expect(userMediaQuerySchema.parse({ favorite: "false" }).favorite).toBe(
      false,
    );
    expect(
      userMediaQuerySchema.safeParse({ favorite: "not-a-boolean" }).success,
    ).toBe(false);
  });

  it("reports malformed array filters as validation errors", () => {
    expect(userMediaQuerySchema.safeParse({ status: "not-json" }).success).toBe(
      false,
    );
    expect(
      userMediaQuerySchema.safeParse({ status: '["planned"' }).success,
    ).toBe(false);
  });

  it("validates IGDB IDs before provider requests", () => {
    expect(mediaDetailsParamsSchema.parse({ id: "42" })).toEqual({ id: 42 });
    expect(mediaDetailsParamsSchema.safeParse({ id: "0" }).success).toBe(false);
    expect(mediaDetailsParamsSchema.safeParse({ id: "1.5" }).success).toBe(
      false,
    );
    expect(mediaDetailsParamsSchema.safeParse({ id: "game" }).success).toBe(
      false,
    );
  });
});

describe("collection request schemas", () => {
  it("trims collection names", () => {
    expect(
      mediaCollectionFormSchema.parse({ name: "  Favorites  " }).name,
    ).toBe("Favorites");
    expect(
      mediaCollectionUpdateSchema.parse({ name: "  Watch next  " }).name,
    ).toBe("Watch next");
  });

  it("rejects blank names and empty updates", () => {
    expect(mediaCollectionFormSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
    expect(mediaCollectionUpdateSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
    expect(mediaCollectionUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("collection reorder request schema", () => {
  const firstId = "11111111-1111-4111-8111-111111111111";
  const secondId = "22222222-2222-4222-8222-222222222222";

  it("accepts a complete sequential order", () => {
    expect(
      reorderMediaCollectionItemsSchema.safeParse({
        items: [
          { id: secondId, position: 1 },
          { id: firstId, position: 2 },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects empty, duplicate, and incomplete orders", () => {
    expect(
      reorderMediaCollectionItemsSchema.safeParse({ items: [] }).success,
    ).toBe(false);
    expect(
      reorderMediaCollectionItemsSchema.safeParse({
        items: [
          { id: firstId, position: 1 },
          { id: firstId, position: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(
      reorderMediaCollectionItemsSchema.safeParse({
        items: [
          { id: firstId, position: 1 },
          { id: secondId, position: 3 },
        ],
      }).success,
    ).toBe(false);
  });
});
