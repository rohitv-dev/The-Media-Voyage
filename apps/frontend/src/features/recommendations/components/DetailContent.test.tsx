// @vitest-environment jsdom

import { DetailContent } from "./DetailContent";
import type { RecommendationDetail } from "@media-voyage/shared/api";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

const friendDetail: RecommendationDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  origin: "friend",
  viewerRole: "recipient",
  recipient: {
    id: "recipient-1",
    name: "Recipient",
    image: null,
  },
  sender: {
    id: "sender-1",
    name: "Ada Lovelace",
    image: null,
  },
  media: {
    id: "22222222-2222-4222-8222-222222222222",
    title: "The Matrix",
    type: "movie",
    description: "A hacker discovers the world is not what it seems.",
    imageUrl: null,
  },
  status: "pending",
  outcome: null,
  senderNote: "You have to see this.",
  recipientNote: null,
  recipientUserMediaId: null,
  existingRecipientUserMediaId: null,
  existingRecipientUserMediaStatus: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  resolvedAt: null,
  expiresAt: null,
};

function renderContent(
  overrides: Partial<ComponentProps<typeof DetailContent>> = {},
) {
  return render(
    <MantineProvider>
      <DetailContent
        detail={friendDetail}
        isLoading={false}
        isError={false}
        resolvePending={false}
        onResolve={vi.fn()}
        onOpenLibrary={vi.fn()}
        {...overrides}
      />
    </MantineProvider>,
  );
}

describe("DetailContent", () => {
  it("resolves a pending recommendation by adding it to the library", () => {
    const onResolve = vi.fn();
    renderContent({ onResolve });

    fireEvent.click(screen.getByRole("button", { name: "Add to library" }));

    expect(onResolve).toHaveBeenCalledWith({
      outcome: "added_to_library",
      addToLibrary: false,
    });
  });

  it("resolves a pending recommendation as not interested", () => {
    const onResolve = vi.fn();
    renderContent({ onResolve });

    fireEvent.click(screen.getByRole("radio", { name: "Not interested" }));
    fireEvent.click(screen.getByRole("button", { name: "Not interested" }));

    expect(onResolve).toHaveBeenCalledWith({
      outcome: "not_interested",
      addToLibrary: false,
    });
  });

  it("resolves with an optional recipient note and library choice", () => {
    const onResolve = vi.fn();
    renderContent({ onResolve });

    fireEvent.click(screen.getByRole("radio", { name: "Already completed" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Also add it to my library" }),
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Add a note" }), {
      target: { value: "  I watched it already.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Already completed" }));

    expect(onResolve).toHaveBeenCalledWith({
      outcome: "already_completed",
      addToLibrary: true,
      recipientNote: "I watched it already.",
    });
  });

  it("shows an existing entry and opens it without creating another one", () => {
    const onOpenLibrary = vi.fn();
    renderContent({
      onOpenLibrary,
      detail: {
        ...friendDetail,
        existingRecipientUserMediaId: "33333333-3333-4333-8333-333333333333",
        existingRecipientUserMediaStatus: "completed",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Open in my library" }));

    expect(onOpenLibrary).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
    );
    expect(
      screen.getByRole("radio", { name: "Already completed" }),
    ).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Add to library" })).toBeNull();
  });

  it("does not offer already completed for an incomplete library entry", () => {
    renderContent({
      detail: {
        ...friendDetail,
        existingRecipientUserMediaId: "33333333-3333-4333-8333-333333333333",
        existingRecipientUserMediaStatus: "in_progress",
      },
    });

    expect(
      screen.queryByRole("radio", { name: "Already completed" }),
    ).toBeNull();
    expect(screen.getByRole("radio", { name: "Not interested" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not interested" })).toBeTruthy();
  });

  it("keeps resolved recommendations read-only and shows the reply", () => {
    renderContent({
      detail: {
        ...friendDetail,
        viewerRole: "sender",
        status: "resolved",
        outcome: "not_interested",
        recipientNote: "Thanks, but this is not for me.",
      },
    });

    expect(screen.getByText("Not interested")).toBeTruthy();
    expect(screen.getByText("Thanks, but this is not for me.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add to library" })).toBeNull();
  });
});
