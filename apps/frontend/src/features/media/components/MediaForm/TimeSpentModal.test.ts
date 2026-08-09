import { describe, expect, it } from "vitest";
import {
  getCatalogRuntimeMinutes,
  getEstimatedTimeSpentMinutes,
} from "./TimeSpentModal";

describe("show time spent calculation", () => {
  it("derives time from watched episodes and average runtime", () => {
    expect(
      getEstimatedTimeSpentMinutes("show", { runtime: 45 }, [
        {
          season: 1,
          expectedEpisodeCount: 10,
          episodesWatched: 4,
          status: "in_progress",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          season: 2,
          expectedEpisodeCount: 8,
          episodesWatched: 2,
          status: "in_progress",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    ).toBe(270);
  });

  it("returns no derived value when runtime is unavailable", () => {
    expect(getEstimatedTimeSpentMinutes("show", undefined, [])).toBeUndefined();
    expect(getCatalogRuntimeMinutes({})).toBeUndefined();
  });
});
