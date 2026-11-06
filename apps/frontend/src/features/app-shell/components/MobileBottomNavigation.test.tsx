// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import {
  ADD_MEDIA_FORM_ID,
  getUpdateMediaFormId,
} from "#/features/media/components/MediaForm/context";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type NavigationProps = Partial<
  React.ComponentProps<typeof MobileBottomNavigation>
>;

function renderNavigation(initialProps: NavigationProps = {}) {
  const onNavigate = vi.fn();
  const onToggleMore = vi.fn();

  const view = (props: NavigationProps) => (
    <MantineProvider>
      <MobileBottomNavigation
        navbarOpened={false}
        pathname="/dashboard"
        onNavigate={onNavigate}
        onToggleMore={onToggleMore}
        {...props}
      />
    </MantineProvider>
  );
  const { rerender } = render(view(initialProps));

  return {
    onNavigate,
    onToggleMore,
    rerenderNavigation: (props: NavigationProps) => rerender(view(props)),
  };
}

describe("MobileBottomNavigation", () => {
  it("navigates normally even with stale form status", () => {
    const { onNavigate, onToggleMore } = renderNavigation({
      mediaFormStatus: { formId: ADD_MEDIA_FORM_ID, isPending: true },
    });

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

  it("keeps Library current and waits for the matching Edit form", () => {
    const { rerenderNavigation } = renderNavigation({
      pathname: "/media/view/media-1",
    });

    expect(
      screen
        .getByRole("button", { name: "Library" })
        .getAttribute("aria-current"),
    ).toBe("page");

    rerenderNavigation({
      pathname: "/media/update/media-1/",
      mediaFormStatus: {
        formId: getUpdateMediaFormId("media-2"),
        isPending: false,
      },
    });

    expect(
      screen
        .getByRole("button", { name: "Library" })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Update media" })
        .disabled,
    ).toBe(true);
  });

  it("shows Save on the Add route and waits for the form to mount", () => {
    renderNavigation({ pathname: "/media/add" });

    const save = screen.getByRole<HTMLButtonElement>("button", {
      name: "Save media",
    });
    expect(save.disabled).toBe(true);
    expect(save.getAttribute("aria-current")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Library" })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks More for secondary routes and while its drawer is open", () => {
    const { rerenderNavigation } = renderNavigation({ pathname: "/settings" });

    expect(
      screen.getByRole("button", { name: "More" }).getAttribute("aria-current"),
    ).toBe("page");

    rerenderNavigation({ pathname: "/dashboard", navbarOpened: true });

    expect(
      screen.getByRole("button", { name: "More" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(
      screen.getByRole("button", { name: "Home" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
