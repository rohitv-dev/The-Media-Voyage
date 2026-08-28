// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ActivityRecord } from "@media-voyage/shared/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityItem } from "./ActivityItem";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const activity = {
  id: "00000000-0000-0000-0000-000000000001",
  type: "media_updated",
  userMediaId: null,
  details: {
    mediaTitle: "Community",
    changes: {
      seasonsProgress: {
        from: [
          {
            season: 1,
            status: "in_progress",
            episodesWatched: 3,
            expectedEpisodeCount: 25,
            updatedAt: "2026-08-28T12:39:36.445Z",
          },
          {
            season: 2,
            status: "planned",
            episodesWatched: 0,
            expectedEpisodeCount: 24,
            updatedAt: "2026-08-28T12:39:36.445Z",
          },
        ],
        to: [
          {
            season: 1,
            status: "in_progress",
            episodesWatched: 5,
            expectedEpisodeCount: 25,
            updatedAt: "2026-08-28T16:56:23.212Z",
          },
          {
            season: 2,
            status: "planned",
            episodesWatched: 0,
            expectedEpisodeCount: 24,
            updatedAt: "2026-08-28T16:56:23.212Z",
          },
        ],
      },
    },
  },
  createdAt: new Date("2026-08-28T16:56:23.212Z"),
} satisfies ActivityRecord;

describe("ActivityItem", () => {
  it("renders season progress without exposing raw JSON", () => {
    render(
      <MantineProvider>
        <ActivityItem activity={activity} />
      </MantineProvider>,
    );

    expect(
      screen.getByText(
        "Seasons progress: Season 1: 3/25 episodes → Season 1: 5/25 episodes",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Season 2/)).toBeNull();
    expect(screen.queryByText(/updatedAt|expectedEpisodeCount/)).toBeNull();
  });
});
