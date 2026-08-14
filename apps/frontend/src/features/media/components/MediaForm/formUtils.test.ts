import { describe, expect, it } from "vitest";
import {
  hasDuplicateSeasonNumbers,
  normalizeNullableNumber,
  normalizeProgress,
  normalizeTimeSpent,
} from "./formUtils";

describe("MediaForm value normalization", () => {
  it("defaults blank progress to zero", () => {
    expect(normalizeProgress("")).toBe(0);
    expect(normalizeProgress(undefined)).toBe(0);
    expect(normalizeProgress("25")).toBe(25);
  });

  it("uses null for blank nullable numbers while preserving zero", () => {
    expect(normalizeNullableNumber("")).toBeNull();
    expect(normalizeNullableNumber(undefined)).toBeNull();
    expect(normalizeNullableNumber(0)).toBe(0);
  });

  it("clears empty or zero time spent values", () => {
    expect(normalizeTimeSpent("")).toBeNull();
    expect(normalizeTimeSpent(0)).toBeNull();
    expect(normalizeTimeSpent("90")).toBe(90);
  });
});

describe("season validation", () => {
  it("detects duplicate season numbers", () => {
    expect(hasDuplicateSeasonNumbers([{ season: 1 }, { season: 1 }])).toBe(
      true,
    );
    expect(hasDuplicateSeasonNumbers([{ season: 1 }, { season: 2 }])).toBe(
      false,
    );
  });
});
