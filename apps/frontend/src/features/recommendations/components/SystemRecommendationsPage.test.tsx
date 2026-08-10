// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type { SystemRecommendationPreviewResponse } from "@media-voyage/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRecommendationsPage } from "./SystemRecommendationsPage";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("#/lib/api", () => ({
  api: apiMock,
  getApiErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Unexpected error",
}));

vi.mock("#/hooks/useAppReducedMotion", () => ({
  useAppReducedMotion: () => true,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

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

const preview: SystemRecommendationPreviewResponse = {
  strategyKey: "provider_recommendations",
  strategyVersion: "4",
  eligibleSeedCount: 7,
  seeds: [
    {
      userMediaId: "11111111-1111-4111-8111-111111111111",
      title: "Arrival",
      type: "movie",
      status: "completed",
      rating: 9,
      favorite: false,
      catalogSource: "tmdb_movie",
      catalogExternalId: "329865",
      mappingStatus: "mapped",
      mappingReason: "provider_id",
      recommendationSource: "tmdb_movie",
      recommendationExternalId: "329865",
      candidateCount: 2,
    },
  ],
  recommendations: [
    {
      rank: 1,
      reason: 'Because you rated "Arrival" 9/10 and "Dune" is a favorite',
      seedUserMediaId: "11111111-1111-4111-8111-111111111111",
      seedUserMediaIds: [
        "11111111-1111-4111-8111-111111111111",
        "33333333-3333-4333-8333-333333333333",
      ],
      media: {
        source: "tmdb_movie",
        externalId: "11",
        title: "First Recommendation",
        type: "movie",
        imageUrl: null,
      },
    },
    {
      rank: 2,
      reason: 'Because "Dune" is a favorite',
      seedUserMediaId: "22222222-2222-4222-8222-222222222222",
      seedUserMediaIds: ["22222222-2222-4222-8222-222222222222"],
      media: {
        source: "open_library",
        externalId: "OL123W",
        title: "Second Recommendation",
        type: "book",
        imageUrl: null,
        creators: ["Example Author"],
        genres: ["Science fiction"],
        numberOfPages: 320,
      },
    },
  ],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function renderPage(onAdd = vi.fn()) {
  const queryClient = new QueryClient();

  return {
    onAdd,
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <SystemRecommendationsPage onAdd={onAdd} />
        </MantineProvider>
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  apiMock.mockReset();
});

afterEach(() => cleanup());

describe("SystemRecommendationsPage", () => {
  it("waits for the user before generating recommendations", async () => {
    const request = deferred<SystemRecommendationPreviewResponse>();
    apiMock.mockReturnValue(request.promise);
    renderPage();

    expect(apiMock).not.toHaveBeenCalled();

    const generateButton = screen.getByRole("button", {
      name: "Generate recommendations",
    });
    fireEvent.click(generateButton);

    expect(apiMock).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(generateButton).toHaveProperty("disabled", true),
    );

    await act(async () => request.resolve(preview));

    expect(
      await screen.findByRole("button", { name: "Generate again" }),
    ).toBeTruthy();
  });

  it("preserves rank, reasons, and provider metadata when adding", async () => {
    const onAdd = vi.fn();
    apiMock.mockResolvedValue(preview);
    renderPage(onAdd);

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendations" }),
    );

    expect(await screen.findByText("First Recommendation")).toBeTruthy();
    expect(screen.getByText("Second Recommendation")).toBeTruthy();
    expect(
      screen.getByText(
        'Because you rated "Arrival" 9/10 and "Dune" is a favorite',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText("Based on 3 titles from your library."),
    ).toBeTruthy();

    const addButtons = screen.getAllByRole("button", {
      name: "Add to library",
    });
    fireEvent.click(addButtons[1]);

    expect(onAdd).toHaveBeenCalledWith({
      id: "",
      ...preview.recommendations[1].media,
    });
  });

  it("dismisses a recommendation and removes it from the current list", async () => {
    apiMock
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ success: true });
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendations" }),
    );
    expect(await screen.findByText("First Recommendation")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);

    await waitFor(() =>
      expect(apiMock).toHaveBeenNthCalledWith(
        2,
        "/recommendations/system/dismiss",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ source: "tmdb_movie", externalId: "11" }),
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByText("First Recommendation")).toBeNull(),
    );
    expect(screen.getByText("Second Recommendation")).toBeTruthy();
  });

  it("shows distinct empty states for missing seeds and missing results", async () => {
    apiMock
      .mockResolvedValueOnce({
        ...preview,
        eligibleSeedCount: 0,
        seeds: [],
        recommendations: [],
      })
      .mockResolvedValueOnce({
        ...preview,
        recommendations: [],
      });
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendations" }),
    );
    expect(
      await screen.findByText("Your library needs a few signals"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Generate again" }));
    expect(await screen.findByText("No suggestions this time")).toBeTruthy();
  });

  it("keeps the last successful list when regeneration fails", async () => {
    apiMock
      .mockResolvedValueOnce(preview)
      .mockRejectedValueOnce(new Error("Provider unavailable"));
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate recommendations" }),
    );
    expect(await screen.findByText("First Recommendation")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Generate again" }));

    await waitFor(() =>
      expect(
        screen.getByText("Recommendations could not be generated"),
      ).toBeTruthy(),
    );
    expect(screen.getByText("First Recommendation")).toBeTruthy();
    expect(screen.getByText(/Provider unavailable/)).toBeTruthy();
  });
});
