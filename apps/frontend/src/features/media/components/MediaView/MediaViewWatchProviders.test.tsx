// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type {
  TmdbWatchAvailability,
  TmdbWatchRegion,
} from "@media-voyage/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionQueryKey, sessionQueryOptions } from "#/auth/session";
import { MediaViewWatchProviders } from "./MediaViewWatchProviders";

const { apiMock, getSessionMock, updateUserMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  getSessionMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("#/auth/authClient", () => ({
  authClient: {
    getSession: getSessionMock,
    updateUser: updateUserMock,
  },
}));
vi.mock("#/lib/api", () => ({
  api: apiMock,
  getApiErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));
vi.mock("#/lib/notifications", () => ({
  showErrorNotification: vi.fn(),
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
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: vi.fn(),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const regions: TmdbWatchRegion[] = [
  { code: "IN", name: "India" },
  { code: "US", name: "United States" },
];

function availability(country = "IN"): TmdbWatchAvailability {
  const provider = {
    id: 1,
    name: "Netflix",
    logoUrl: null,
    displayPriority: 0,
  };
  return {
    country,
    link: "https://www.themoviedb.org/movie/101/watch?locale=" + country,
    offers: {
      flatrate: [provider],
      free: [{ ...provider, id: 2, name: "Free service" }],
      ads: [{ ...provider, id: 3, name: "Ad service" }],
      rent: [{ ...provider, id: 4, name: "Rental service" }],
      buy: [{ ...provider, id: 5, name: "Purchase service" }],
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

let queryClient: QueryClient;

function renderProviders() {
  return render(
    <MantineProvider env="test">
      <QueryClientProvider client={queryClient}>
        <MediaViewWatchProviders type="movie" id={101} />
      </QueryClientProvider>
    </MantineProvider>,
  );
}

beforeEach(() => {
  apiMock.mockReset();
  getSessionMock.mockReset();
  updateUserMock.mockReset();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const data = { user: { id: "viewer", watchCountry: "IN" } };
  getSessionMock.mockResolvedValue({ data, error: null });
  queryClient.setQueryData(sessionQueryKey, data);
  apiMock.mockImplementation(async (path: string) =>
    path.endsWith("watch-regions")
      ? regions
      : availability(
          new URL(path, "https://example.test").searchParams.get("country") ??
            "IN",
        ),
  );
  updateUserMock.mockImplementation(
    async ({ watchCountry }: { watchCountry: string }) => {
      getSessionMock.mockResolvedValue({
        data: { user: { id: "viewer", watchCountry } },
        error: null,
      });
      return { error: null };
    },
  );
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});

describe("Where to watch", () => {
  it("loads automatically and displays all offer categories and the watch page link", async () => {
    renderProviders();
    expect(screen.getByText("Loading watch options…")).toBeTruthy();
    await screen.findByText("Netflix");
    for (const label of ["Subscription", "Free", "With ads", "Rent", "Buy"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(
      screen
        .getByRole("link", { name: "View watch options" })
        .getAttribute("href"),
    ).toBe("https://www.themoviedb.org/movie/101/watch?locale=IN");
    expect(apiMock).toHaveBeenCalledWith(
      "/media/tmdb/movie/101/watch/providers?country=IN",
    );
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("saves a country change through Better Auth and requests the new country", async () => {
    renderProviders();
    await screen.findByText("Netflix");
    const select = screen.getByRole("combobox", { name: "Watch country" });
    await waitFor(() => expect(select).toHaveProperty("disabled", false));
    fireEvent.click(select);
    fireEvent.click(
      await screen.findByRole("option", { name: "United States" }),
    );
    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({ watchCountry: "US" }),
    );
    await waitFor(() =>
      expect(apiMock).toHaveBeenCalledWith(
        "/media/tmdb/movie/101/watch/providers?country=US",
      ),
    );
    expect(queryClient.getQueryData(sessionQueryKey)).toMatchObject({
      user: { watchCountry: "US" },
    });
    expect(
      screen.getByRole("combobox", { name: "Watch country" }),
    ).toHaveProperty("value", "United States");
  });

  it("offers a retry when the session lookup failed", async () => {
    queryClient.removeQueries({ queryKey: sessionQueryKey });
    queryClient.setQueryDefaults(sessionQueryKey, { retryOnMount: false });
    getSessionMock.mockResolvedValueOnce({
      data: null,
      error: { status: 503 },
    });
    await expect(
      queryClient.fetchQuery({ ...sessionQueryOptions, retry: false }),
    ).rejects.toThrow("Unable to reach the server");

    renderProviders();
    await screen.findByText("Could not load your watch country.");
    expect(screen.queryByText("Loading watch options…")).toBeNull();
    expect(apiMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Netflix");
  });
});
