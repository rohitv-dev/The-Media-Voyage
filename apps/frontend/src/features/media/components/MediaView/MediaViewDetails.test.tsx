// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaViewData } from "./index";
import { MediaViewDetails } from "./MediaViewDetails";

vi.mock("#/features/named-entities/queries", () => ({
  useSourceColorMap: () => new Map(),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const data = {
  id: "user-media-1",
  mediaId: "media-1",
  title: "Dune",
  type: "movie",
  description: null,
  imageUrl: null,
  imageFocusX: null,
  imageFocusY: null,
  catalogSource: "tmdb_movie",
  catalogExternalId: "438631",
  catalogMetadata: { releaseDate: "2024-10-22" },
  status: "planned",
  rating: null,
  review: null,
  notes: null,
  progress: 0,
  favorite: false,
  timeSpent: null,
  pagesRead: null,
  source: null,
  tags: [],
  visibility: "private",
  seasonsProgress: [],
  startedAt: null,
  completedAt: null,
  lastProgressUpdate: new Date("2026-09-01T00:00:00Z"),
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
} satisfies MediaViewData;

describe("MediaViewDetails", () => {
  it("formats the catalog release date for saved media", () => {
    render(
      <MantineProvider>
        <MediaViewDetails data={data} />
      </MantineProvider>,
    );

      expect(screen.getByText("Release Year")).toBeTruthy();
    expect(screen.getByText("2024")).toBeTruthy();
  });
});
