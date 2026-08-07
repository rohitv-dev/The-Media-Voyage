import { describe, expect, it } from "vitest";
import {
  reorderMediaCollectionItemsSchema,
  userMediaFormSchema,
  userMediaPatchSchema,
} from "@media-voyage/shared/api";

describe("user-media request schemas", () => {
  it("keeps canonical media fields required for POST", () => {
    expect(userMediaFormSchema.safeParse({ title: "Dune" }).success).toBe(false);
    expect(
      userMediaFormSchema.safeParse({ title: "Dune", type: "movie" }).success,
    ).toBe(true);
  });

  it("accepts a single tracking field for PATCH", () => {
    expect(userMediaPatchSchema.parse({ progress: 42 })).toEqual({ progress: 42 });
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
    expect(reorderMediaCollectionItemsSchema.safeParse({ items: [] }).success).toBe(false);
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
