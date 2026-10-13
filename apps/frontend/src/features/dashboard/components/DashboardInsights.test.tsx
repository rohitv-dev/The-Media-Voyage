// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type { BarChartProps } from "@mantine/charts";
import type {
  DashboardStatsResponse,
  MediaRecord,
} from "@media-voyage/shared/api";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardInsights } from "./DashboardInsights";
import { DashboardContinue } from "./DashboardContinue";

vi.mock("@mantine/charts", () => ({
  BarChart: ({ data, series, type }: BarChartProps) => (
    <output
      aria-label={
        series[0].name === "added"
          ? "Additions chart"
          : type === "stacked"
            ? "Completions chart"
            : "Distribution chart"
      }
    >
      {JSON.stringify({ data, series, type })}
    </output>
  ),
}));
vi.mock("#/hooks/useAppReducedMotion", () => ({
  useAppReducedMotion: () => true,
}));
vi.mock("#/features/media/hooks/useCoverArtPreference", () => ({
  useCoverArtPreference: () => [false],
}));

const data: DashboardStatsResponse = {
  summary: {
    total_media: 0,
    completed: 0,
    planned: 0,
    in_progress: 0,
    playing: 0,
    on_hold: 0,
    dropped: 0,
    revisiting: 0,
    collections: 0,
  },
  statusDistribution: [],
  mediaTypeDistribution: [],
  ratingDistribution: [],
  completionTrend: [
    { month: "2026-01", count: 3, movie: 1, show: 0, book: 1, game: 1 },
    { month: "2025-12", count: 2, movie: 0, show: 2, book: 0, game: 0 },
  ],
  addedTrend: [
    { month: "2026-01", count: 5 },
    { month: "2024-03", count: 1 },
  ],
  nearlyFinished: [],
  timeSpent: { totalMinutes: 0, byType: [] },
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-13T12:00:00"));
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
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderInsights(stats = data) {
  render(
    <MantineProvider>
      <DashboardInsights
        data={stats}
        isMobile={false}
        barChartHeight={320}
        onStatusClick={vi.fn()}
        onRatingClick={vi.fn()}
        onTypeClick={vi.fn()}
      />
    </MantineProvider>,
  );
}

function chart(label: string): {
  data: Record<string, number | string>[];
  series: { name: string; label: string }[];
  type?: string;
} {
  return JSON.parse(screen.getByLabelText(label).textContent);
}

describe("dashboard trends", () => {
  it("defaults to this year, fills missing months, and stacks completions by media type", () => {
    renderInsights();
    expect(screen.getByLabelText<HTMLSelectElement>("Trend Year").value).toBe(
      "2026",
    );
    const additions = chart("Additions chart");
    expect(additions.data).toHaveLength(12);
    expect(additions.data[0]).toMatchObject({
      month: "Jan 2026",
      added: 5,
      completed: 3,
    });
    expect(additions.data[1]).toMatchObject({
      month: "Feb 2026",
      added: 0,
      completed: 0,
    });
    const completions = chart("Completions chart");
    expect(completions.type).toBe("stacked");
    expect(completions.data[0]).toMatchObject({
      movie: 1,
      show: 0,
      book: 1,
      game: 1,
    });
    expect(completions.series.map((series) => series.label)).toEqual([
      "Movies",
      "Shows",
      "Books",
      "Games",
    ]);
  });

  it("changes both charts together and offers years with additions or completions", () => {
    renderInsights();
    const year = screen.getByLabelText("Trend Year");
    fireEvent.change(year, { target: { value: "2025" } });
    expect(chart("Additions chart").data[11]).toMatchObject({
      month: "Dec 2025",
      added: 0,
      completed: 2,
    });
    expect(chart("Completions chart").data[11]).toMatchObject({ show: 2 });
    fireEvent.change(year, { target: { value: "2024" } });
    expect(chart("Additions chart").data[2]).toMatchObject({
      month: "Mar 2024",
      added: 1,
      completed: 0,
    });
    expect(screen.getByText("No completions recorded in 2024.")).toBeTruthy();
  });

  it("explains an empty year instead of rendering empty trend charts", () => {
    renderInsights({ ...data, addedTrend: [], completionTrend: [] });
    expect(
      screen.getByText("No additions or completions recorded in 2026."),
    ).toBeTruthy();
    expect(screen.getByText("No completions recorded in 2026.")).toBeTruthy();
    expect(screen.queryByLabelText("Additions chart")).toBeNull();
    expect(screen.queryByLabelText("Completions chart")).toBeNull();
  });
});

describe("continue views", () => {
  it("switches between recent and nearly finished without showing both lists", async () => {
    const item: MediaRecord = {
      id: "title-1",
      title: "Nearly Done",
      type: "book",
      imageUrl: null,
      imageFocusX: null,
      imageFocusY: null,
      status: "in_progress",
      progress: 92,
      rating: null,
      favorite: false,
      visibility: "private",
      source: null,
      lastProgressUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const onView = vi.fn();
    render(
      <MantineProvider>
        <DashboardContinue
          items={[
            {
              ...item,
              id: "recent-1",
              title: "Recently Updated",
              progress: 20,
            },
          ]}
          nearlyFinished={[item]}
          reduceMotion
          onViewAll={vi.fn()}
          onView={onView}
        />
      </MantineProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Resume Recently Updated" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("link", { name: "Resume Nearly Done" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Nearly Finished" }));
    expect(screen.getByText("92%")).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Resume Recently Updated" }),
      ).toBeNull(),
    );
    expect(screen.queryByRole("button", { name: "View all" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Resume Nearly Done" }));
    expect(onView).toHaveBeenCalledWith("title-1");
    fireEvent.click(screen.getByRole("radio", { name: "Recent" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("link", { name: "Resume Nearly Done" }),
      ).toBeNull(),
    );
    expect(
      screen.getByRole("link", { name: "Resume Recently Updated" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "View all" })).toBeTruthy();
  });

  it("explains how to populate an empty section", () => {
    render(
      <MantineProvider>
        <DashboardContinue
          items={[]}
          nearlyFinished={[]}
          reduceMotion
          onViewAll={vi.fn()}
          onView={vi.fn()}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("Nothing in progress")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Nearly Finished" }));
    expect(screen.getByText("No partially finished titles")).toBeTruthy();
  });
});
