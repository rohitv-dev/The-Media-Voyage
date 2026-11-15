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
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
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
    onAddSearch: vi.fn(),
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
  onlineManager.setOnline(true);
  vi.useRealTimers();
});

describe("CommandPalette", () => {
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

  it("keeps matching commands available during a search and after an error", async () => {
    apiMock.mockRejectedValue(new Error("Search failed"));
    renderPalette();
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });

    fireEvent.change(input, { target: { value: "settings" } });

    screen.getByText("Searching your library...");
    screen.getByRole("option", { name: /Settings/ });

    await screen.findByText("Library search is unavailable. Try again.");
    screen.getByRole("option", { name: /Settings/ });
  });

  it("offers the searched title for adding after an empty search", async () => {
    const onAddSearch = vi.fn();
    renderPalette({ onAddSearch });
    const input = screen.getByRole("textbox", {
      name: "Search actions or pages",
    });
    fireEvent.change(input, { target: { value: "  dune  " } });

    const option = await screen.findByRole("option", { name: /Add media/ });
    expect(screen.getByText("No library matches found.")).toBeTruthy();
    await waitFor(() =>
      expect(option.getAttribute("data-combobox-selected")).not.toBeNull(),
    );
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onAddSearch).toHaveBeenCalledWith("dune");
  });

  it("does not offer adding when the library search fails", async () => {
    apiMock.mockRejectedValue(new Error("Search failed"));
    renderPalette();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search actions or pages" }),
      {
        target: { value: "dune" },
      },
    );
    expect(screen.queryByRole("option", { name: /Add media/ })).toBeNull();
    await screen.findByText("Library search is unavailable. Try again.");
    expect(screen.queryByRole("option", { name: /Add media/ })).toBeNull();
  });

  it("does not treat a paused search as an empty result", async () => {
    onlineManager.setOnline(false);
    renderPalette();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Search actions or pages" }),
      {
        target: { value: "dune" },
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.getByText("Searching your library...")).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Add media/ })).toBeNull();
  });

  it("keeps focus on the destination after adding a search", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function Handoff() {
      const [opened, setOpened] = useState(false);
      const [destination, setDestination] = useState(false);
      return (
        <>
          <button onClick={() => setOpened(true)}>Open palette</button>
          {destination && <input aria-label="Destination title" autoFocus />}
          <CommandPalette
            opened={opened}
            onClose={() => setOpened(false)}
            onNavigate={vi.fn()}
            onOpenMedia={vi.fn()}
            onOpenLibrarySearch={vi.fn()}
            onAddSearch={() => setDestination(true)}
          />
        </>
      );
    }
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <Handoff />
        </MantineProvider>
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Open palette" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Search actions or pages" }),
      { target: { value: "dune" } },
    );
    fireEvent.click(await screen.findByRole("option", { name: /Add media/ }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Destination title" }),
    );
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
