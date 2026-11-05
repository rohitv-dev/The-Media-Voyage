// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "#/lib/api";
import { Route } from "./index";

vi.mock("#/lib/api", () => ({
  api: vi.fn(),
  getApiErrorMessage: (error: Error) => error.message,
}));
vi.mock("#/features/tutorials/useTutorial", () => ({
  useTutorial: () => ({ start: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const added = new Date("2026-09-01T00:00:00Z");
const firstPage = {
  id: "space-one",
  title: "Space One",
  type: "movie",
  imageUrl: null,
  imageFocusX: null,
  imageFocusY: null,
  status: "planned",
  progress: 0,
  rating: null,
  favorite: false,
  visibility: "private",
  source: null,
  lastProgressUpdate: added,
  createdAt: added,
  updatedAt: added,
} satisfies MediaRecord;
const secondPage = { ...firstPage, id: "space-two", title: "Space Two" };

it("keeps a filtered library and its second page when returning from details", async () => {
  let reachEnd: (() => void) | undefined;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        reachEnd = () => callback([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("scrollTo", vi.fn());

  vi.mocked(api).mockImplementation(async (path) => {
    const { pathname, searchParams } = new URL(path, "http://test.local");
    if (pathname === "/user-media/dropdowns") return { sources: [], tags: [] };
    if (pathname === "/collection" || pathname === "/sources") return [];
    if (
      pathname === "/user-media/filter/page" &&
      searchParams.get("search") === "Space" &&
      searchParams.get("status") === '["planned"]'
    ) {
      if (searchParams.get("page") === "1") {
        return { success: true, data: [firstPage], nextPage: 2 };
      }
      if (searchParams.get("page") === "2") {
        return { success: true, data: [secondPage], nextPage: null };
      }
    }
    throw new Error(`Unexpected request: ${path}`);
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const root = createRootRouteWithContext<{ queryClient: QueryClient }>()();
  const libraryOptions = {
    ...Route.options,
    getParentRoute: () => root,
    path: "/media/",
  };
  const library = Route.update(libraryOptions);
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/media/view/$id",
    component: () => <h1>Media details</h1>,
  });
  const router = createRouter({
    routeTree: root.addChildren([library, detail]),
    history: createMemoryHistory({
      initialEntries: ["/media?search=Space&status=%5B%22planned%22%5D"],
    }),
    context: { queryClient: client },
  });
  render(
    <MantineProvider env="test">
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  );

  await screen.findByRole("link", { name: /Space One/ });
  expect(reachEnd).toBeDefined();
  await act(async () => reachEnd?.());
  fireEvent.click(await screen.findByRole("link", { name: /Space Two/ }));
  await screen.findByRole("heading", { name: "Media details" });
  expect(router.state.location.pathname).toBe("/media/view/space-two");

  await act(async () => router.history.back());
  await screen.findByRole("link", { name: /Space Two/ });
  screen.getByRole("link", { name: /Space One/ });
  expect(screen.getByPlaceholderText("Search Titles")).toHaveProperty(
    "value",
    "Space",
  );
  expect(screen.getByRole("checkbox", { name: "Planned" })).toHaveProperty(
    "checked",
    true,
  );
  expect(router.state.location.search).toMatchObject({
    search: "Space",
    status: ["planned"],
  });
});
