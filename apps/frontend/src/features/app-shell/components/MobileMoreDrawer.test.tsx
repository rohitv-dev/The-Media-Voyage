// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileMoreDrawer } from "./MobileMoreDrawer";

vi.mock("#/features/friends/queries", () => ({
  friendRequestsQueryOptions: {
    queryKey: ["friend-requests"],
    queryFn: async () => ({ incoming: [{ id: "1" }, { id: "2" }] }),
    initialData: { incoming: [{ id: "1" }, { id: "2" }] },
    staleTime: Infinity,
  },
}));

vi.mock("#/features/notifications/queries", () => ({
  latestNotificationsQueryOptions: {
    queryKey: ["notifications"],
    queryFn: async () => ({ unseenCount: 4 }),
    initialData: { unseenCount: 4 },
    staleTime: Infinity,
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MobileMoreDrawer", () => {
  it("groups secondary destinations and keeps account actions available", () => {
    const onNavigate = vi.fn();
    const onLogout = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <MobileMoreDrawer
            opened
            pathname="/settings"
            userName="Potato Lord"
            onClose={vi.fn()}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        </MantineProvider>
      </QueryClientProvider>,
    );

    screen.getByRole("navigation", { name: "More navigation" });
    screen.getByText("Browse");
    screen.getByText("Manage");
    expect(screen.queryByRole("button", { name: /add media/i })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Settings" })
        .getAttribute("aria-current"),
    ).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Collections" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(onNavigate).toHaveBeenCalledWith("/collection");
    expect(onLogout).toHaveBeenCalledOnce();

    queryClient.clear();
  });
});
