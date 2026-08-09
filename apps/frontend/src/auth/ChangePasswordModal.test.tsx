// @vitest-environment jsdom

import { ChangePasswordModal } from "./ChangePasswordModal";
import { MantineProvider } from "@mantine/core";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  changePassword: vi.fn(),
  signInEmail: vi.fn(),
  signOut: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn(),
}));

vi.mock("#/auth/authClient", () => ({
  authClient: {
    changePassword: authMocks.changePassword,
    signIn: { email: authMocks.signInEmail },
    signOut: authMocks.signOut,
  },
}));

vi.mock("#/lib/notifications", () => notificationMocks);

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

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.changePassword.mockResolvedValue({ data: {} });
  authMocks.signInEmail.mockResolvedValue({ data: {} });
  authMocks.signOut.mockResolvedValue({ data: {} });
});

function renderModal(
  props: Partial<React.ComponentProps<typeof ChangePasswordModal>> = {},
) {
  return render(
    <MantineProvider>
      <ChangePasswordModal opened onClose={vi.fn()} {...props} />
    </MantineProvider>,
  );
}

function fillForm({
  currentPassword = "current-password",
  newPassword = "new-password",
  confirmNewPassword = newPassword,
}: {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirmNewPassword },
  });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Change password" }));
}

describe("ChangePasswordModal", () => {
  it("validates password requirements before calling Better Auth", () => {
    renderModal();
    fillForm({ newPassword: "short", confirmNewPassword: "different" });
    submit();

    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeTruthy();
    expect(screen.getByText("Passwords must match")).toBeTruthy();
    expect(authMocks.changePassword).not.toHaveBeenCalled();
  });

  it("rejects a new password that matches the current password", () => {
    renderModal();
    fillForm({
      currentPassword: "same-password",
      newPassword: "same-password",
    });
    submit();

    expect(
      screen.getByText(
        "New password must be different from your current password",
      ),
    ).toBeTruthy();
    expect(authMocks.changePassword).not.toHaveBeenCalled();
  });

  it("changes an authenticated user's password and revokes other sessions", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    renderModal({ onClose, onSuccess });
    fillForm();
    submit();

    await waitFor(() => {
      expect(authMocks.changePassword).toHaveBeenCalledWith({
        currentPassword: "current-password",
        newPassword: "new-password",
        revokeOtherSessions: true,
      });
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(notificationMocks.showSuccessNotification).toHaveBeenCalledWith({
      message: "Your password has been changed.",
    });
  });

  it("signs in with the login email before changing the password", async () => {
    const onSuccess = vi.fn();
    renderModal({ email: "ada@example.com", onSuccess });
    fillForm();
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());

    expect(authMocks.signInEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "current-password",
    });
    expect(authMocks.changePassword).toHaveBeenCalledWith({
      currentPassword: "current-password",
      newPassword: "new-password",
      revokeOtherSessions: true,
    });
    expect(authMocks.signInEmail.mock.invocationCallOrder[0]).toBeLessThan(
      authMocks.changePassword.mock.invocationCallOrder[0],
    );
  });

  it("does not attempt a password change when login fails", async () => {
    authMocks.signInEmail.mockResolvedValue({
      error: { message: "Invalid email or password" },
    });
    renderModal({ email: "ada@example.com" });
    fillForm();
    submit();

    await waitFor(() => {
      expect(notificationMocks.showErrorNotification).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });

    expect(authMocks.changePassword).not.toHaveBeenCalled();
    expect(authMocks.signOut).not.toHaveBeenCalled();
  });

  it("signs out a temporary login when changing the password fails", async () => {
    authMocks.changePassword.mockResolvedValue({
      error: { message: "Could not change password" },
    });
    renderModal({ email: "ada@example.com" });
    fillForm();
    submit();

    await waitFor(() => expect(authMocks.signOut).toHaveBeenCalledOnce());

    expect(notificationMocks.showErrorNotification).toHaveBeenCalledWith({
      message: "Could not change password",
    });
  });

  it("clears entered passwords when closed", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByLabelText("Current password")).toHaveProperty(
      "value",
      "",
    );
    expect(screen.getByLabelText("New password")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Confirm new password")).toHaveProperty(
      "value",
      "",
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
