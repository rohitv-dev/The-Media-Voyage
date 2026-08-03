// @vitest-environment jsdom

import { NotificationPopover } from "./NotificationPopover";
import type {
  NotificationListResponse,
  NotificationRecord,
} from "@media-voyage/shared/api";
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

afterEach(() => cleanup());

const recommendation: NotificationRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "friend_recommendation",
  actorName: "Ada Lovelace",
  actorImage: null,
  userMediaId: null,
  recommendationId: "22222222-2222-4222-8222-222222222222",
  recommendationOutcome: null,
  mediaTitle: "The Matrix",
  seenAt: null,
  createdAt: new Date(),
};

const data: NotificationListResponse = {
  data: [recommendation],
  total: 1,
  unseenCount: 1,
  page: 1,
  pageSize: 5,
};

describe("NotificationPopover", () => {
  it("passes the complete recommendation notification to its opener", () => {
    const onOpenNotification = vi.fn();

    render(
      <MantineProvider>
        <NotificationPopover
          opened
          data={data}
          isLoading={false}
          isError={false}
          onChange={vi.fn()}
          onOpenNotification={onOpenNotification}
          onViewAll={vi.fn()}
        />
      </MantineProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Ada Lovelace recommended The Matrix/i,
      }),
    );

    expect(onOpenNotification).toHaveBeenCalledWith(recommendation);
  });
});
