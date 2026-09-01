// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContinueMediaCard } from "../ContinueMediaCard";
import { MobileMediaCard } from "../MobileMediaCard";
import { MediaCard } from "./index";

afterEach(cleanup);

vi.mock("../MediaCoverArtFocusModal", () => ({
  MediaCoverArtFocusModal: () => null,
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

vi.mock("#/features/media/hooks/useCoverArtPreference", () => ({
  useCoverArtPreference: () => [false],
}));

vi.mock("#/features/media/hooks/useCoverArtSizePreference", () => ({
  useCoverArtSizePreference: () => ["full"],
}));

vi.mock("#/features/media/hooks/useMediaCardActions", () => ({
  useMediaCardActions: () => ({
    isActionPending: false,
    requestDelete: vi.fn(),
    runQuickAction: vi.fn(),
  }),
}));

vi.mock("#/features/named-entities/queries", () => ({
  useSourceColorMap: () => new Map(),
}));

vi.mock("#/hooks/useAppReducedMotion", () => ({
  useAppReducedMotion: () => true,
}));

const media = {
  id: "media-1",
  title: "Community",
  type: "show",
  imageUrl: null,
  imageFocusX: null,
  imageFocusY: null,
  status: "in_progress",
  progress: 25,
  rating: null,
  favorite: false,
  visibility: "private",
  source: null,
  lastProgressUpdate: new Date("2026-09-01T00:00:00Z"),
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
} satisfies MediaRecord;

describe("MediaCard", () => {
  it("renders the record target as a native browser link", () => {
    render(
      <MantineProvider>
        <MediaCard media={media} readOnly onView={vi.fn()} />
      </MantineProvider>,
    );

    const link = screen.getByRole("link");
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("/media/view/media-1");
  });

  it("uses an explicit destination for alternate record views", () => {
    render(
      <MantineProvider>
        <MediaCard
          media={media}
          readOnly
          onView={vi.fn()}
          viewHref="/friends/media/media-1"
        />
      </MantineProvider>,
    );

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/friends/media/media-1",
    );
  });

  it("gives continuation cards a native record link", () => {
    render(
      <MantineProvider>
        <ContinueMediaCard media={media} onView={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/media/view/media-1",
    );
  });

  it("gives mobile cards a native record link", () => {
    render(
      <MantineProvider>
        <MobileMediaCard media={media} onView={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/media/view/media-1",
    );
  });
});
