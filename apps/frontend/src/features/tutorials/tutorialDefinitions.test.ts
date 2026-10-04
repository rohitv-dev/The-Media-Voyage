import {
  getNextTutorialProgress,
  getTutorialSteps,
  isTutorialSeen,
} from "./tutorialDefinitions";
import { describe, expect, it } from "vitest";

describe("tutorial version guards", () => {
  it("starts when the stored version is absent or older", () => {
    expect(isTutorialSeen("library", {})).toBe(false);
    expect(isTutorialSeen("library", { library: 0 })).toBe(false);
  });

  it("does not start for the current or a newer stored version", () => {
    expect(isTutorialSeen("library", { library: 1 })).toBe(true);
    expect(isTutorialSeen("library", { library: 2 })).toBe(true);
  });

  it("merges completion without downgrading newer versions", () => {
    expect(
      getNextTutorialProgress({ library: 2, "future-tour": 3 }, "library"),
    ).toEqual({ library: 2, "future-tour": 3 });
  });

  it("only includes TMDB sync for eligible show edits", () => {
    expect(
      getTutorialSteps("show-seasons", { canSync: false }).map(
        (step) => step.data?.id,
      ),
    ).toEqual(["show-manage-seasons"]);
    expect(
      getTutorialSteps("show-seasons", { canSync: true }).map(
        (step) => step.data?.id,
      ),
    ).toEqual(["show-manage-seasons", "show-sync-seasons"]);
  });
});
