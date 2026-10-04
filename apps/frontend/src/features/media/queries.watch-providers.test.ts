import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import type { TmdbWatchAvailability } from "@media-voyage/shared/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tmdbWatchProvidersOptions } from "./queries";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock("#/lib/api", () => ({ api: apiMock }));

let client: QueryClient;
const now = new Date("2026-10-04T00:00:00Z");

function availability(country = "IN"): TmdbWatchAvailability {
  return {
    country,
    link: null,
    offers: { flatrate: [], free: [], ads: [], rent: [], buy: [] },
    expiresAt: new Date(now.getTime() + 1000).toISOString(),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  apiMock.mockReset();
  client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
  client.mount();
});

afterEach(() => {
  client.unmount();
  client.clear();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
  vi.useRealTimers();
});

describe("watch-provider queries", () => {
  it.each([
    {
      event: "window focus",
      setActive: (active: boolean) => focusManager.setFocused(active),
    },
    {
      event: "reconnect",
      setActive: (active: boolean) => onlineManager.setOnline(active),
    },
  ])(
    "refreshes mounted availability on $event only after expiry",
    async ({ setActive }) => {
      apiMock.mockResolvedValue(availability());
      const options = tmdbWatchProvidersOptions("movie", 101, "IN");
      await client.fetchQuery(options);
      const observer = new QueryObserver(client, options);
      const unsubscribe = observer.subscribe(() => {});
      try {
        setActive(false);
        setActive(true);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(apiMock).toHaveBeenCalledOnce();

        vi.setSystemTime(now.getTime() + 1000);
        setActive(false);
        setActive(true);
        await vi.waitFor(() => expect(apiMock).toHaveBeenCalledTimes(2));
      } finally {
        unsubscribe();
      }
    },
  );
});
