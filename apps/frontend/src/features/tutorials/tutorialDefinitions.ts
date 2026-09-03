import { driver } from "driver.js";
import type { DriveStep, Driver } from "driver.js";

export const TUTORIAL_IDS = [
  "app-orientation",
  "library",
  "add-media",
  "show-seasons",
] as const;

export type TutorialId = (typeof TUTORIAL_IDS)[number];
export type TutorialProgress = Partial<Record<TutorialId, number>>;

export const TUTORIAL_VERSIONS = {
  "app-orientation": 1,
  library: 1,
  "add-media": 1,
  "show-seasons": 1,
} as const satisfies Record<TutorialId, number>;

type TutorialStepOptions = {
  canSync?: boolean;
};

type TutorialDefinition = {
  steps: (options: TutorialStepOptions) => DriveStep[];
};

const PHONE_QUERY = "(max-width: 47.99em)";
const TABLET_QUERY = "(max-width: 61.99em)";

function matches(query: string) {
  if (typeof window === "undefined") return false;

  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}

function responsiveCopy(
  wideCopy: string,
  phoneCopy: string,
  tabletCopy = wideCopy,
) {
  return matches(PHONE_QUERY)
    ? phoneCopy
    : matches(TABLET_QUERY)
      ? tabletCopy
      : wideCopy;
}

function responsiveElement(
  wideSelector: string,
  phoneSelector: string,
  tabletSelector = wideSelector,
) {
  return () => {
    const selector = matches(PHONE_QUERY)
      ? phoneSelector
      : matches(TABLET_QUERY)
        ? tabletSelector
        : wideSelector;

    return document.querySelector(selector) as Element;
  };
}

function tutorialStep(
  id: string,
  element: DriveStep["element"],
  title: string,
  description: string,
  options: Pick<DriveStep, "skipMissingElement" | "waitForElement"> = {},
): DriveStep {
  return {
    element,
    data: { id },
    popover: { title, description },
    ...options,
  };
}

export const tutorialDefinitions: Record<TutorialId, TutorialDefinition> = {
  "app-orientation": {
    steps: () => [
      tutorialStep(
        "dashboard-overview",
        '[data-tutorial="dashboard-overview"]',
        "Your dashboard",
        "See your personal snapshot and use the shortcuts to jump into filtered Library views",
      ),
      tutorialStep(
        "dashboard-navigation",
        responsiveElement(
          '[data-tutorial="dashboard-navigation-desktop"]',
          '[data-tutorial="dashboard-navigation-mobile"]',
        ),
        "Navigation",
        responsiveCopy(
          "Use the sidebar on the left to move around Media Voyage",
          "Use the bottom navigation to move around Media Voyage. Open More for additional pages and actions",
          "Use the sidebar and header actions to move around Media Voyage",
        ),
        { skipMissingElement: true },
      ),
      tutorialStep(
        "dashboard-search",
        responsiveElement(
          '[data-tutorial="dashboard-search-wide"]',
          '[data-tutorial="dashboard-search-compact"]',
        ),
        "Search or jump",
        "Search your library or jump straight to a page or action",
        { skipMissingElement: true },
      ),
      tutorialStep(
        "dashboard-add-media",
        responsiveElement(
          '[data-tutorial="dashboard-add-media-wide"]',
          '[data-tutorial="dashboard-add-media-mobile"]',
          '[data-tutorial="dashboard-add-media-compact"]',
        ),
        "Add media",
        responsiveCopy(
          "Add a movie, show, book, or game from the header action",
          "Tap Add in the bottom navigation to add a movie, show, book, or game",
          "Add a movie, show, book, or game from the compact header action",
        ),
        { skipMissingElement: true },
      ),
    ],
  },
  library: {
    steps: () => [
      tutorialStep(
        "library-core-controls",
        '[data-tutorial="library-core-controls"]',
        "Library controls",
        "Filter your library and switch between grid and table views when the table is available",
      ),
      tutorialStep(
        "library-presets",
        '[data-tutorial="library-presets"]',
        "Filter presets",
        "Save the current filter combination and reapply it later",
      ),
      tutorialStep(
        "library-pick-for-me",
        '[data-tutorial="library-pick-for-me"]',
        "Pick for me",
        "Choose an item from your Planned list, optionally narrowed by the picker's filters",
      ),
      tutorialStep(
        "library-describe",
        '[data-tutorial="library-describe"]',
        "Describe what you want",
        "Explore your library across titles, metadata, and meaning. Regular filters pause while you explore",
      ),
    ],
  },
  "add-media": {
    steps: () => [
      tutorialStep(
        "media-title-selector",
        '[data-tutorial="media-title-selector"]',
        "Choose a title",
        "Search for a title or add one manually",
      ),
      tutorialStep(
        "media-type-selector",
        '[data-tutorial="media-type-selector"]',
        "Choose a media type",
        "Select whether you are tracking a movie, show, game, or book",
      ),
      tutorialStep(
        "media-progress-status",
        '[data-tutorial="media-progress-status"]',
        "Track progress",
        "Use status, progress, rating, and dates to keep your entry current",
      ),
      tutorialStep(
        "media-save",
        responsiveElement(
          '[data-tutorial="media-save-desktop"]',
          '[data-tutorial="media-save-mobile"]',
        ),
        "Save your entry",
        "Review the form and save your tracked entry when you are ready",
        { skipMissingElement: true },
      ),
    ],
  },
  "show-seasons": {
    steps: ({ canSync = false }) => [
      tutorialStep(
        "show-manage-seasons",
        '[data-tutorial="show-manage-seasons"]',
        "Manage Seasons",
        "Open the season editor to track each season's number, status, watched episodes, and notes",
      ),
      ...(canSync
        ? [
            tutorialStep(
              "show-sync-seasons",
              '[data-tutorial="show-sync-seasons"]',
              "Sync seasons",
              "Refresh season data from TMDB and merge it with your current progress. Review the resulting form changes, then save",
              { skipMissingElement: true, waitForElement: 500 },
            ),
          ]
        : []),
    ],
  },
};

export function getTutorialSteps(
  id: TutorialId,
  options: TutorialStepOptions = {},
) {
  return tutorialDefinitions[id].steps(options);
}

export function normalizeTutorialProgress(value: unknown): TutorialProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const progress: Record<string, number> = {};

  for (const [key, version] of Object.entries(value)) {
    if (typeof version === "number" && Number.isFinite(version)) {
      progress[key] = version;
    }
  }

  return progress;
}

export function isTutorialSeen(id: TutorialId, progress: unknown) {
  const storedVersion = normalizeTutorialProgress(progress)[id];
  return (
    typeof storedVersion === "number" && storedVersion >= TUTORIAL_VERSIONS[id]
  );
}

export function shouldStartTutorial(
  id: TutorialId,
  progress: unknown,
  forced = false,
) {
  return forced || !isTutorialSeen(id, progress);
}

export function getNextTutorialProgress(
  progress: unknown,
  id: TutorialId,
): TutorialProgress {
  const nextProgress = normalizeTutorialProgress(progress);
  nextProgress[id] = Math.max(nextProgress[id] ?? 0, TUTORIAL_VERSIONS[id]);
  return nextProgress;
}

export function createTutorialDriver(
  id: TutorialId,
  options: {
    canSync?: boolean;
    reduceMotion: boolean;
    onDestroyed: () => void;
  },
): Driver {
  return driver({
    steps: getTutorialSteps(id, { canSync: options.canSync }),
    animate: !options.reduceMotion,
    smoothScroll: !options.reduceMotion,
    allowClose: true,
    allowKeyboardControl: true,
    overlayClickBehavior: "close",
    showProgress: true,
    showButtons: ["previous", "next", "close"],
    nextBtnText: "Next",
    prevBtnText: "Previous",
    doneBtnText: "Done",
    onDestroyed: options.onDestroyed,
  });
}
