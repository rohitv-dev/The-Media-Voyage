// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SemanticSearchPanel } from "./SemanticSearchPanel";

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
        <SemanticSearchPanel
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

describe("SemanticSearchPanel", () => {
  it("focuses the input for a focus request", () => {
    renderPanel();

    expect(document.activeElement).toBe(
      screen.getByRole("textbox", {
        name: "Describe what you're looking for",
      }),
    );
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
