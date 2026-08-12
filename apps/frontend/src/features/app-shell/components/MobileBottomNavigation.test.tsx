// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNavigation } from "./MobileBottomNavigation";

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

function renderNavigation(
  props: Partial<React.ComponentProps<typeof MobileBottomNavigation>> = {},
) {
  const onNavigate = vi.fn();
  const onToggleMore = vi.fn();

  render(
    <MantineProvider>
      <MobileBottomNavigation
        navbarOpened={false}
        pathname="/dashboard"
        onNavigate={onNavigate}
        onToggleMore={onToggleMore}
        {...props}
      />
    </MantineProvider>,
  );

  return { onNavigate, onToggleMore };
}

afterEach(cleanup);

describe("MobileBottomNavigation", () => {
  it("navigates from each primary action and opens More", () => {
    const { onNavigate, onToggleMore } = renderNavigation();

    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    fireEvent.click(screen.getByRole("button", { name: "Library" }));
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "For you" }));
    fireEvent.click(screen.getByRole("button", { name: "More" }));

    expect(onNavigate.mock.calls).toEqual([
      ["/dashboard"],
      ["/media"],
      ["/media/add"],
      ["/recommendations"],
    ]);
    expect(onToggleMore).toHaveBeenCalledOnce();
  });

  it("marks library detail and edit routes as Library", () => {
    const { rerender } = render(
      <MantineProvider>
        <MobileBottomNavigation
          navbarOpened={false}
          pathname="/media/view/media-1"
          onNavigate={vi.fn()}
          onToggleMore={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(
      screen
        .getByRole("button", { name: "Library" })
        .getAttribute("aria-current"),
    ).toBe("page");

    rerender(
      <MantineProvider>
        <MobileBottomNavigation
          navbarOpened={false}
          pathname="/media/update/media-1"
          onNavigate={vi.fn()}
          onToggleMore={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(
      screen
        .getByRole("button", { name: "Library" })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  it("distinguishes Add from other media routes", () => {
    renderNavigation({ pathname: "/media/add" });

    expect(
      screen.getByRole("button", { name: "Add" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen
        .getByRole("button", { name: "Library" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks More for secondary routes and while its drawer is open", () => {
    const { rerender } = render(
      <MantineProvider>
        <MobileBottomNavigation
          navbarOpened={false}
          pathname="/settings"
          onNavigate={vi.fn()}
          onToggleMore={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("button", { name: "More" }).getAttribute("aria-current"),
    ).toBe("page");

    rerender(
      <MantineProvider>
        <MobileBottomNavigation
          navbarOpened
          pathname="/dashboard"
          onNavigate={vi.fn()}
          onToggleMore={vi.fn()}
        />
      </MantineProvider>,
    );

    expect(
      screen.getByRole("button", { name: "More" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
