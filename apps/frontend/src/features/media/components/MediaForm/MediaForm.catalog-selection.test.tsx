// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type {
  ResolvedCatalogMedia,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "#/lib/api";
import { MediaForm } from "./index";

vi.mock("@tanstack/react-router", () => ({
  useCanGoBack: () => false,
  useLocation: () => undefined,
  useNavigate: () => vi.fn(),
  useRouter: () => ({ history: { back: vi.fn(), go: vi.fn() } }),
}));
vi.mock("#/hooks/useUnsavedChangesBlocker", () => ({
  useUnsavedChangesBlocker: vi.fn(),
}));
vi.mock("#/features/tutorials/useTutorial", () => ({
  useTutorial: () => ({ start: vi.fn() }),
}));
vi.mock("#/lib/api", () => ({
  api: vi.fn(),
  getApiErrorMessage: (error: Error) => error.message,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("saves the latest catalog selection when an older lookup finishes last", async () => {
  const arrival = {
    id: "",
    title: "Arrival",
    type: "movie",
    source: "tmdb_movie" as const,
    externalId: "101",
    imageUrl: null,
  } satisfies SourceMediaRecord;
  const dune = { ...arrival, title: "Dune", externalId: "202" };
  let finishArrival: ((record: ResolvedCatalogMedia) => void) | undefined;
  const pendingArrival = new Promise<ResolvedCatalogMedia>((resolve) => {
    finishArrival = resolve;
  });
  vi.mocked(api).mockImplementation(async (path, options) => {
    if (path.startsWith("/media/search?")) {
      const query = new URL(path, "http://test.local").searchParams.get("q");
      if (query === arrival.title) return [arrival];
      if (query === dune.title) return [dune];
      return [];
    }
    if (path === "/media/resolve") {
      const { externalId } = JSON.parse(String(options?.body));
      if (externalId === "101") return pendingArrival;
      if (externalId === "202") {
        return {
          ...dune,
          id: "catalog-dune",
          description: "Dune details",
          metadata: {},
        };
      }
    }
    if (path === "/user-media") return { id: "saved-dune", title: dune.title };
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <MantineProvider env="test">
      <QueryClientProvider client={client}>
        <MediaForm mode="add" dropdowns={{ sources: [], tags: [] }} />
      </QueryClientProvider>
    </MantineProvider>,
  );

  const title = screen.getByRole("textbox", { name: "Title" });
  const choose = async (name: string) => {
    fireEvent.change(title, { target: { value: name } });
    fireEvent.click(
      await screen.findByRole(
        "option",
        { name: new RegExp(`^${name}`) },
        { timeout: 2_000 },
      ),
    );
  };
  await choose("Arrival");
  const [save] = screen.getAllByRole<HTMLButtonElement>("button", {
    name: "Save Media",
  });
  expect(save.disabled).toBe(true);
  await choose("Dune");
  await waitFor(() => expect(save.disabled).toBe(false));

  await act(async () =>
    finishArrival?.({
      ...arrival,
      id: "catalog-arrival",
      description: "Arrival details",
      metadata: {},
    }),
  );
  fireEvent.click(save);

  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "/user-media",
      expect.objectContaining({ method: "POST" }),
    ),
  );
  const request = vi
    .mocked(api)
    .mock.calls.find(([path]) => path === "/user-media");
  expect(request?.[1]?.method).toBe("POST");
  expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({
    title: "Dune",
    mediaId: "catalog-dune",
    description: "Dune details",
  });
});
