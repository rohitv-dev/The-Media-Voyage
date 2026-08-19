// @vitest-environment jsdom

import { CommandPalette } from "./CommandPalette";
import { MantineProvider } from "@mantine/core";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock("#/lib/api", () => ({ api: apiMock }));

vi.mock("#/hooks/useAppReducedMotion", () => ({
  useAppReducedMotion: () => false,
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);
Element.prototype.scrollIntoView = vi.fn();

function setMobileViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 47.99em)" ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderPalette(
  props: Partial<React.ComponentProps<typeof CommandPalette>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const defaultProps = {
    opened: true,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    onOpenMedia: vi.fn(),
    onOpenLibrarySearch: vi.fn(),
  };
  const renderElement = (
    nextProps: Partial<React.ComponentProps<typeof CommandPalette>>,
  ) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <CommandPalette {...defaultProps} {...nextProps} />
      </MantineProvider>
    </QueryClientProvider>
  );
  const result = render(renderElement(props));

  return {
    ...result,
    rerenderPalette: (
      nextProps: Partial<React.ComponentProps<typeof CommandPalette>>,
    ) => result.rerender(renderElement(nextProps)),
  };
}

beforeEach(() => {
  setMobileViewport(false);
  apiMock.mockReset();
  apiMock.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CommandPalette", () => {
  it("shows the static action and navigation groups", () => {
    renderPalette();

    expect(screen.getByText("Actions")).toBeTruthy();
    expect(screen.getByText("Add media")).toBeTruthy();
    expect(screen.getByText("Navigate")).toBeTruthy();
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Collections")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("filters commands by labels, descriptions, and keywords", () => {
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "theme" } });

    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.queryByText("Dashboard")).toBeNull();
    expect(screen.queryByText("Add media")).toBeNull();
  });

  it("runs pointer-selected commands and clears the query", () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    renderPalette({ onClose, onNavigate });
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "settings" } });
    fireEvent.click(screen.getByRole("option", { name: /Settings/ }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("/settings");
    expect(input).toHaveProperty("value", "");
  });

  it("opens described library search from the actions group", () => {
    const onClose = vi.fn();
    const onOpenLibrarySearch = vi.fn();
    renderPalette({ onClose, onOpenLibrarySearch });
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "describe" } });
    fireEvent.click(
      screen.getByRole("option", { name: /Describe what you want/ }),
    );

    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenLibrarySearch).toHaveBeenCalledOnce();
  });

  it("supports keyboard selection", async () => {
    const onNavigate = vi.fn();
    renderPalette({ onNavigate });
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "add media" } });
    await waitFor(() => {
      expect(
        screen
          .getByRole("option", { name: /Add media/ })
          .getAttribute("data-combobox-selected"),
      ).not.toBeNull();
    });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onNavigate).toHaveBeenCalledWith("/media/add");
  });

  it("uses the full-screen modal on mobile", async () => {
    setMobileViewport(true);
    renderPalette();

    await waitFor(() => {
      expect(document.querySelector("[data-full-screen]")).not.toBeNull();
    });
  });

  it("waits for two characters and debounces library searches by 300 ms", async () => {
    vi.useFakeTimers();
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "a" } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(apiMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "alien" } });
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(apiMock).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(apiMock).toHaveBeenCalledWith("/user-media/search?search=alien");
  });

  it("keeps commands available while library search is loading", () => {
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "settings" } });

    expect(screen.getByText("Searching your library...")).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows library search errors without hiding matching commands", async () => {
    apiMock.mockRejectedValue(new Error("Search failed"));
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "settings" } });

    expect(
      await screen.findByText("Library search is unavailable. Try again."),
    ).toBeTruthy();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows an empty library state after a settled search", async () => {
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "zz" } });

    expect(await screen.findByText("No library matches found.")).toBeTruthy();
  });

  it("shows at most 20 library matches before static commands", async () => {
    apiMock.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        id: `media-${index + 1}`,
        title: `Library result ${index + 1}`,
        type: "movie",
      })),
    );
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "library" } });

    expect(await screen.findByText("Library result 1")).toBeTruthy();
    expect(screen.queryByText("Library result 21")).toBeNull();
    const options = screen.getAllByRole("option");
    expect(
      options.filter((option) => option.textContent.includes("Library result")),
    ).toHaveLength(20);
    expect(options[0].textContent).toContain("Library result 1");
    expect(options[19].textContent).toContain("Library result 20");
    expect(options[20].textContent).not.toContain("Library result");
  });

  it("opens a selected library entry and clears the query", async () => {
    apiMock.mockResolvedValue([
      { id: "media-42", title: "Dune", type: "book" },
    ]);
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    const onOpenMedia = vi.fn();
    renderPalette({ onClose, onNavigate, onOpenMedia });
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "dune" } });
    const mediaOption = await screen.findByRole("option", { name: /Dune/ });
    await waitFor(() => {
      expect(mediaOption.getAttribute("data-combobox-selected")).not.toBeNull();
    });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenMedia).toHaveBeenCalledWith("media-42");
    expect(onNavigate).not.toHaveBeenCalled();
    expect(input).toHaveProperty("value", "");
  });

  it("clears search state when the palette closes", () => {
    const { rerenderPalette } = renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "dune" } });
    rerenderPalette({ opened: false });
    rerenderPalette({ opened: true });

    expect(
      screen.getByRole("textbox", { name: "Search actions or pages" }),
    ).toHaveProperty("value", "");
  });
});
