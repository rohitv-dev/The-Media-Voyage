// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "#/lib/api";
import { CollectionFindMedia } from "./CollectionFindMedia";

const results = vi.hoisted(() => [
  { id: "new-title", title: "Space Story", type: "movie", imageUrl: null },
  {
    id: "included-title",
    title: "Already Added",
    type: "book",
    imageUrl: null,
  },
]);

vi.mock("#/lib/api", () => ({
  api: vi.fn(),
  getApiErrorMessage: (error: Error) => error.message,
}));
vi.mock("#/features/media/queries", () => ({
  userMediaHybridSearchQueryOptions: (query: string) => ({
    queryKey: ["picker-search", query],
    queryFn: async () => results,
  }),
}));
vi.mock("#/lib/notifications", () => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(cleanup);

async function renderPicker() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <MantineProvider env="test">
      <QueryClientProvider client={queryClient}>
        <CollectionFindMedia
          collectionId="collection-1"
          includedMediaIds={["included-title"]}
        />
      </QueryClientProvider>
    </MantineProvider>,
  );
  await screen.findByRole("checkbox", { name: "Select Space Story" });
}

describe("collection picker actions", () => {
  it("shows actions only after selection and clears without submitting", async () => {
    await renderPicker();
    expect(
      screen.queryByRole("group", { name: "Selected collection media" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Space Story" }),
    );
    const actions = screen.getByRole("group", {
      name: "Selected collection media",
    });
    expect(within(actions).getByText("1 selected")).toBeTruthy();
    fireEvent.click(within(actions).getByRole("button", { name: "Clear" }));
    expect(
      screen.queryByRole("group", { name: "Selected collection media" }),
    ).toBeNull();
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Select Space Story",
      }).checked,
    ).toBe(false);
    expect(api).not.toHaveBeenCalled();
  });

  it("adds selected eligible media and clears the action bar after success", async () => {
    vi.mocked(api).mockResolvedValueOnce(undefined);
    await renderPicker();
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", {
        name: "Already Added is already in this collection",
      }).disabled,
    ).toBe(true);
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Space Story" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add selected" }));
    await waitFor(() => {
      expect(api).toHaveBeenCalledWith("/collectionItem/collection-1/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMediaIds: ["new-title"] }),
      });
      expect(
        screen.queryByRole("group", { name: "Selected collection media" }),
      ).toBeNull();
    });
  });
});
