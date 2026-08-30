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

function renderPanel(onClear = vi.fn()) {
  return {
    onClear,
    ...render(
      <MantineProvider>
        <LibrarySearchPanel
          query=""
          isSearching={false}
          onSearch={vi.fn()}
          onClear={onClear}
          focusRequest={1}
        />
      </MantineProvider>,
    ),
  };
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

  it("explains the supported web-style search syntax", () => {
    renderPanel();

    expect(
      screen.getByText(/Web-style syntax is supported:.*quotes.*-word.*OR/),
    ).toBeTruthy();
  });

  it("explains the minimum query length while typing", () => {
    renderPanel();
    const input = screen.getByRole("textbox", {
      name: "Describe what you're looking for",
    });

    fireEvent.change(input, { target: { value: "spa" } });

    expect(
      screen.getByText("Enter at least 5 characters to explore."),
    ).toBeTruthy();
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
