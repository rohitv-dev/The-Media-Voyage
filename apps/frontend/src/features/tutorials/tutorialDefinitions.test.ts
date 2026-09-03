import {
  getNextTutorialProgress,
  getTutorialSteps,
  isTutorialSeen,
  shouldStartTutorial,
} from "./tutorialDefinitions";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

function stubViewport(phone: boolean, tablet = false) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: query === "(max-width: 47.99em)" ? phone : tablet,
    }),
  });
}

describe("tutorial version guards", () => {
  it("starts when the stored version is absent or older", () => {
    expect(shouldStartTutorial("library", {})).toBe(true);
    expect(shouldStartTutorial("library", { library: 0 })).toBe(true);
    expect(isTutorialSeen("library", { library: 0 })).toBe(false);
  });

  it("does not start for the current or a newer stored version", () => {
    expect(shouldStartTutorial("library", { library: 1 })).toBe(false);
    expect(shouldStartTutorial("library", { library: 2 })).toBe(false);
    expect(isTutorialSeen("library", { library: 2 })).toBe(true);
  });

  it("always starts a forced replay", () => {
    expect(shouldStartTutorial("library", { library: 1 }, true)).toBe(true);
  });

  it("uses the matching navigation and add-media copy", () => {
    stubViewport(true);
    const steps = getTutorialSteps("app-orientation");

    expect(steps[1].popover?.description).toBe(
      "Use the bottom navigation to move around Media Voyage. Open More for additional pages and actions",
    );
    expect(steps[3].popover?.description).toBe(
      "Tap Add in the bottom navigation to add a movie, show, book, or game",
    );

    stubViewport(false);
    const desktopSteps = getTutorialSteps("app-orientation");
    expect(desktopSteps[1].popover?.description).toBe(
      "Use the sidebar on the left to move around Media Voyage",
    );
    expect(desktopSteps[3].popover?.description).toBe(
      "Add a movie, show, book, or game from the header action",
    );
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
