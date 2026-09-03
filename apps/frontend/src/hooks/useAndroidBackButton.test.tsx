// @vitest-environment jsdom

import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAndroidBackButton } from "./useAndroidBackButton";

const { addListenerMock, closeDrawerMock, exitAppMock, openConfirmModalMock } =
  vi.hoisted(() => ({
    addListenerMock: vi.fn(),
    closeDrawerMock: vi.fn(),
    exitAppMock: vi.fn(),
    openConfirmModalMock: vi.fn(),
  }));

vi.mock("@capacitor/app", () => ({
  App: { addListener: addListenerMock, exitApp: exitAppMock },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android" },
}));

vi.mock("@mantine/modals", () => ({
  modals: { openConfirmModal: openConfirmModalMock },
}));

let backButtonHandler: ((event: { canGoBack: boolean }) => void) | undefined;

beforeEach(() => {
  addListenerMock.mockImplementation((_, handler) => {
    backButtonHandler = handler;
    return Promise.resolve({ remove: vi.fn() });
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe("useAndroidBackButton", () => {
  it("dismisses UI before navigating and confirms before leaving", async () => {
    const historyBack = vi.spyOn(window.history, "back");
    const { rerender } = renderHook(
      ({ drawerOpened }) => useAndroidBackButton(drawerOpened, closeDrawerMock),
      { initialProps: { drawerOpened: false } },
    );

    await waitFor(() => expect(backButtonHandler).toBeDefined());

    backButtonHandler?.({ canGoBack: true });
    expect(historyBack).toHaveBeenCalledOnce();

    rerender({ drawerOpened: true });
    backButtonHandler?.({ canGoBack: false });
    expect(closeDrawerMock).toHaveBeenCalledOnce();

    rerender({ drawerOpened: false });
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "dialog");
    const dismissDialog = vi.fn();
    document.addEventListener("keydown", dismissDialog);
    backButtonHandler?.({ canGoBack: false });
    expect(dismissDialog).toHaveBeenCalledOnce();
    expect(openConfirmModalMock).not.toHaveBeenCalled();
    document.removeEventListener("keydown", dismissDialog);
    dialog.remove();

    backButtonHandler?.({ canGoBack: false });
    expect(openConfirmModalMock).toHaveBeenCalledOnce();
    openConfirmModalMock.mock.calls[0][0].onConfirm();
    expect(exitAppMock).toHaveBeenCalledOnce();
  });
});
