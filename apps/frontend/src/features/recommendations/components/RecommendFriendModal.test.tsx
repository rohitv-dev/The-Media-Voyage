// @vitest-environment jsdom

import { RecommendFriendModal } from "./RecommendFriendModal";
import type { FriendRecord } from "@media-voyage/shared/api";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

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

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

Object.defineProperty(document, "fonts", {
  value: {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

afterEach(() => cleanup());

const friends: FriendRecord[] = [
  {
    userId: "friend-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    image: null,
    friendshipId: "11111111-1111-4111-8111-111111111111",
    since: null,
    sharedCount: 3,
  },
];

function renderModal(
  overrides: Partial<ComponentProps<typeof RecommendFriendModal>> = {},
) {
  return render(
    <MantineProvider>
      <RecommendFriendModal
        opened
        onClose={vi.fn()}
        mediaTitle="The Matrix"
        friends={friends}
        onSubmit={vi.fn()}
        {...overrides}
      />
    </MantineProvider>,
  );
}

describe("RecommendFriendModal", () => {
  it("requires a friend and sends the trimmed optional note", () => {
    const onSubmit = vi.fn();
    renderModal({ onSubmit });

    expect(
      screen.getByRole("button", { name: "Send recommendation" }),
    ).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("combobox", { name: "Send to" }));
    fireEvent.click(screen.getByRole("option", { name: /Ada Lovelace/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Add a note" }), {
      target: { value: "  You have to watch this.  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send recommendation" }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      recipientId: "friend-1",
      senderNote: "You have to watch this.",
    });
  });

  it("explains the empty-friends state and links to friends", () => {
    renderModal({ friends: [] });

    expect(screen.getByText("No friends yet")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Manage friends" }).getAttribute("href"),
    ).toBe("/friends");
    expect(
      screen.getByRole("button", { name: "Send recommendation" }),
    ).toHaveProperty("disabled", true);
  });

  it("shows friend-loading and submission errors", () => {
    renderModal({
      friendsLoading: true,
      friendsError: "Could not load friends",
      submitError: "This recommendation already exists",
    });

    expect(screen.getByText("Could not load friends")).toBeTruthy();
    expect(screen.getByText("This recommendation already exists")).toBeTruthy();
  });
});
