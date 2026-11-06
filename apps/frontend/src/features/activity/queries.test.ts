import { api } from "#/lib/api";
import type { CalendarActivityResponse } from "@media-voyage/shared/api";
import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { calendarActivityOptions } from "./queries";

vi.mock("#/lib/api", () => ({ api: vi.fn() }));

it("places a month-boundary status change on its local calendar day", async () => {
  const occurredAt = new Date(2026, 10, 1).toISOString();
  vi.mocked(api).mockResolvedValue({
    from: "2026-10-31",
    to: "2026-12-01",
    events: [
      {
        date: occurredAt.slice(0, 10),
        occurredAt,
        eventType: "status_change",
        userMediaId: "11111111-1111-4111-8111-111111111111",
        mediaId: "22222222-2222-4222-8222-222222222222",
        title: "Arrival",
        type: "movie",
        status: "on_hold",
        fromStatus: "in_progress",
        toStatus: "on_hold",
      },
    ],
  } satisfies CalendarActivityResponse);

  const { events } = await new QueryClient().fetchQuery(
    calendarActivityOptions("2026-11"),
  );

  expect(api).toHaveBeenCalledWith(
    "/user-media/calendar/activity?from=2026-10-31&to=2026-12-01",
  );
  expect(events.map(({ date }) => date)).toEqual(["2026-11-01"]);
});
