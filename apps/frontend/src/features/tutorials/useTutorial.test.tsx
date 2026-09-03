// @vitest-environment jsdom

import { sessionQueryKey } from "#/auth/session";
import { useTutorial } from "./useTutorial";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  driverMock,
  getSessionMock,
  showErrorNotificationMock,
  updateUserMock,
} = vi.hoisted(() => ({
  driverMock: vi.fn(),
  getSessionMock: vi.fn(),
  showErrorNotificationMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

vi.mock("driver.js", () => ({ driver: driverMock }));

vi.mock("#/auth/authClient", () => ({
  authClient: {
    getSession: getSessionMock,
    updateUser: updateUserMock,
  },
}));

vi.mock("#/hooks/useAppReducedMotion", () => ({
  useAppReducedMotion: () => false,
}));

vi.mock("#/lib/notifications", () => ({
  showErrorNotification: showErrorNotificationMock,
}));

type FakeDriverConfig = {
  onDestroyed?: () => void;
};

type FakeDriver = {
  destroy: ReturnType<typeof vi.fn>;
  isActive: () => boolean;
};

let currentDriver: FakeDriver | undefined;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function seedSession(queryClient: QueryClient, tutorialProgress = {}) {
  queryClient.setQueryData(sessionQueryKey, {
    user: { tutorialProgress },
  });
}

beforeEach(() => {
  currentDriver = undefined;
  driverMock.mockReset();
  driverMock.mockImplementation((config: FakeDriverConfig) => {
    let active = false;
    const destroy = vi.fn(() => {
      if (!active) return;
      active = false;
      config.onDestroyed?.();
    });
    currentDriver = {
      destroy,
      isActive: () => active,
    };

    return {
      isActive: () => active,
      drive: () => {
        active = true;
      },
      destroy,
    };
  });
  getSessionMock.mockResolvedValue({
    data: { user: { tutorialProgress: {} } },
    error: null,
  });
  updateUserMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useTutorial", () => {
  it("persists automatic completion once", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    seedSession(queryClient);

    renderHook(() => useTutorial("library"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(driverMock).toHaveBeenCalledOnce());
    currentDriver?.destroy();
    currentDriver?.destroy();

    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({
        tutorialProgress: { library: 1 },
      }),
    );
    expect(updateUserMock).toHaveBeenCalledOnce();
  });

  it("does not persist a forced replay", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    seedSession(queryClient, { library: 1 });

    const { result } = renderHook(() => useTutorial("library"), {
      wrapper: createWrapper(queryClient),
    });

    result.current.start();
    await waitFor(() => expect(driverMock).toHaveBeenCalledOnce());
    currentDriver?.destroy();

    expect(updateUserMock).not.toHaveBeenCalled();
    expect(showErrorNotificationMock).not.toHaveBeenCalled();
  });

  it("destroys an active driver on unmount", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    seedSession(queryClient);

    const { unmount } = renderHook(() => useTutorial("library"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(driverMock).toHaveBeenCalledOnce());
    unmount();

    expect(currentDriver?.destroy).toHaveBeenCalledOnce();
  });
});
