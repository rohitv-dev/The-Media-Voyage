import type {
  ActivityFilters,
  ActivityListQuery,
  ActivityListResponse,
  CalendarActivityResponse,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import dayjs from "dayjs";
import { z } from "zod";

export const activityMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .optional();

async function getActivity(query: ActivityListQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, String(value));
  }

  return api<ActivityListResponse>(`/activity?${params.toString()}`);
}

export function activityListQueryOptions({
  page = 1,
  action,
  type,
  search,
  from,
  to,
}: ActivityFilters & { page?: number } = {}) {
  const query: ActivityListQuery = {
    page,
    limit: 20,
    action,
    type,
    search,
    from: from ? dayjs(from).startOf("day").toISOString() : undefined,
    to: to ? dayjs(to).add(1, "day").startOf("day").toISOString() : undefined,
  };

  return queryOptions({
    queryKey: queryKeys.activity.list(query),
    queryFn: () => getActivity(query),
  });
}

export function calendarActivityOptions(month: string) {
  return queryOptions({
    queryKey: queryKeys.activity.calendar(month),
    queryFn: async () => {
      const start = dayjs(`${month}-01`);
      const end = start.endOf("month");
      // Include the adjacent UTC dates for changes near local month boundaries.
      const from = start.subtract(1, "day").format("YYYY-MM-DD");
      const to = end.add(1, "day").format("YYYY-MM-DD");
      const data = await api<CalendarActivityResponse>(
        `/user-media/calendar/activity?from=${from}&to=${to}`,
      );
      const events = data.events
        .map((event) =>
          event.eventType === "status_change"
            ? { ...event, date: dayjs(event.occurredAt).format("YYYY-MM-DD") }
            : event,
        )
        .filter(({ date }) => date.startsWith(`${month}-`));

      return {
        from: start.format("YYYY-MM-DD"),
        to: end.format("YYYY-MM-DD"),
        events,
      };
    },
  });
}
