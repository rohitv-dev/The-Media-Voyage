import { describe, expect, it } from "vitest";
import { getActivityChanges, pickInitialActivityValues } from "./details";

describe("activity details", () => {
  it("keeps only changed fields", () => {
    expect(
      getActivityChanges(
        { rating: 7, progress: 20, tags: ["one"] },
        { rating: 8, progress: 20, tags: ["two"] },
        ["rating", "progress", "tags"],
      ),
    ).toEqual({
      rating: { from: 7, to: 8 },
      tags: { from: ["one"], to: ["two"] },
    });
  });

  it("omits default and empty initial values", () => {
    expect(
      pickInitialActivityValues({
        status: "planned",
        progress: 0,
        favorite: false,
        visibility: "private",
        rating: 8,
        notes: "Keep this",
        tags: [],
      }),
    ).toEqual({ rating: 8, notes: "Keep this" });
  });
});
