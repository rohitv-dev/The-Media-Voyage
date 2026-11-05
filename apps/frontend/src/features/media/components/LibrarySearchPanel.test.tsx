// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibrarySearchPanel } from "./LibrarySearchPanel";

beforeEach(() => {
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

afterEach(cleanup);

function renderPanel() {
  const onSearch = vi.fn();
  const onClear = vi.fn();

  render(
    <MantineProvider>
      <LibrarySearchPanel
        query=""
        isSearching={false}
        onSearch={onSearch}
        onClear={onClear}
        focusRequest={1}
      />
    </MantineProvider>,
  );

  return { onSearch, onClear };
}

describe("LibrarySearchPanel", () => {
  it("focuses the input for a focus request", () => {
    renderPanel();

    expect(document.activeElement).toBe(
      screen.getByRole("textbox", {
        name: "Describe what you're looking for",
      }),
    );
  });

  it("submits a trimmed query only when it meets the minimum length", () => {
    const { onSearch } = renderPanel();
    const input = screen.getByRole("textbox", {
      name: "Describe what you're looking for",
    });
    const explore = screen.getByRole("button", { name: "Explore" });

    fireEvent.change(input, { target: { value: "  spac  " } });
    fireEvent.click(explore);
    expect(onSearch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "  space  " } });
    fireEvent.click(explore);
    expect(onSearch).toHaveBeenCalledExactlyOnceWith("space");
  });

  it("uses the same clear action when Escape is pressed", () => {
    const { onClear } = renderPanel();
    const input = screen.getByRole("textbox", {
      name: "Describe what you're looking for",
    });

    fireEvent.change(input, { target: { value: "space games" } });
    fireEvent.keyDown(input, { key: "Escape", code: "Escape" });

    expect(onClear).toHaveBeenCalledOnce();
  });
});
