// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import type { GetSimilarLibraryMediaResponse } from "@media-voyage/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  useParams,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { queryKeys } from "#/lib/queryKeys";
import { MediaViewSimilar } from "./MediaViewSimilar";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock("#/lib/api", () => ({ api: apiMock }));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

const matches: GetSimilarLibraryMediaResponse = [
  {
    id: "arrival",
    title: "Arrival",
    type: "movie",
    imageUrl: "/arrival.jpg",
    imageFocusX: null,
    imageFocusY: null,
  },
  {
    id: "expanse",
    title: "The Expanse",
    type: "show",
    imageUrl: null,
    imageFocusX: null,
    imageFocusY: null,
  },
  {
    id: "dune",
    title: "Dune",
    type: "book",
    imageUrl: null,
    imageFocusX: null,
    imageFocusY: null,
  },
];

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "/media/view/$id",
    component: () => {
      const { id } = useParams({ strict: false });
      return id ? <MediaViewSimilar id={id} /> : null;
    },
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/media/view/seed"] }),
  });
  render(
    <MantineProvider env="test">
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  return { client, router };
}

beforeEach(() => {
  apiMock.mockReset();
  window.scrollTo = vi.fn();
});
afterEach(cleanup);

it("shows the ranked compact cards and navigates to a match's own details", async () => {
  apiMock.mockImplementation((path: string) =>
    Promise.resolve(path === "/user-media/seed/similar" ? matches : []),
  );
  const { router } = mount();

  await screen.findByRole("heading", { name: "Similar in Your Library" });
  const links = screen.getAllByRole("link");
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/media/view/arrival",
    "/media/view/expanse",
    "/media/view/dune",
  ]);
  expect(links[0].textContent).toBe("Arrivalmovie");
  expect(screen.getByRole("presentation").getAttribute("src")).toBe(
    "/arrival.jpg",
  );

  fireEvent.click(links[0]);
  await waitFor(() =>
    expect(router.state.location.pathname).toBe("/media/view/arrival"),
  );
  await waitFor(() =>
    expect(apiMock).toHaveBeenCalledWith("/user-media/arrival/similar"),
  );
  await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
});

it("renders no placeholder while loading", async () => {
  apiMock.mockReturnValue(new Promise(() => {}));
  mount();
  await waitFor(() => expect(apiMock).toHaveBeenCalled());
  expect(screen.queryByRole("region")).toBeNull();
});

it.each(["empty", "failure"])(
  "hides the section on %s results",
  async (state) => {
    if (state === "empty") apiMock.mockResolvedValue([]);
    else apiMock.mockRejectedValue(new Error("Unavailable"));
    const { client } = mount();
    await waitFor(() =>
      expect(
        client.getQueryState(queryKeys.userMedia.similar("seed"))?.status,
      ).toBe(state === "empty" ? "success" : "error"),
    );
    expect(screen.queryByRole("region")).toBeNull();
  },
);

it("refreshes matches when the library is invalidated", async () => {
  apiMock.mockResolvedValue(matches);
  const { client } = mount();
  await screen.findByRole("heading", { name: "Similar in Your Library" });
  apiMock.mockResolvedValue([]);
  await client.invalidateQueries({ queryKey: queryKeys.userMedia.all });
  await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
});
