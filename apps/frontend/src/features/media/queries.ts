import { api } from "#/lib/api";
import { queryOptions } from "@tanstack/react-query";
import dayjs from "dayjs";
import type {
  CalendarActivityResponse,
  DashboardStatsResponse,
  UserMediaCounts,
  GetUserMediaResponse,
  MediaDetailedRecord,
  UserMediaQuerySchema,
  UserMediaDropdowns,
  MediaPickerQuery,
  MediaPickerRecord,
} from "@media-voyage/shared/api";

async function getUserMedia() {
  return api<GetUserMediaResponse>("/user-media");
}

async function getUserMediaDetailedRecord(id: string) {
  return api<MediaDetailedRecord>(`/user-media/${id}`);
}

/**
 * Serialize a filter object into a query string (with leading `?`, or empty
 * when nothing is set). Falsy values are skipped and arrays are JSON-encoded,
 * matching what the user-media endpoints expect.
 */
function buildFilterQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;

    params.set(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value),
    );
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function getUserMediaFilterRecords(filters: UserMediaQuerySchema) {
  return api<GetUserMediaResponse>(
    `/user-media/filter${buildFilterQuery(filters)}`,
  );
}

async function getUserMediaCounts() {
  return api<UserMediaCounts>("/user-media/counts");
}

async function getUserMediaDropdowns() {
  return api<UserMediaDropdowns>("/user-media/dropdowns");
}

export function getDashboardStats() {
  return api<DashboardStatsResponse>("/user-media/dashboard/stats");
}

export function getMediaPickerPath(filters: MediaPickerQuery) {
  return `/user-media/pick${buildFilterQuery(filters)}`;
}

export function pickPlannedMedia(filters: MediaPickerQuery) {
  return api<MediaPickerRecord | null>(getMediaPickerPath(filters));
}

export function userMediaDetailedOptions(id: string) {
  return queryOptions({
    queryKey: ["user-media", { id }],
    queryFn: () => getUserMediaDetailedRecord(id),
  });
}

export const userMediaQueryOptions = queryOptions({
  queryKey: ["user-media"],
  queryFn: getUserMedia,
});

export function userMediaFilterQueryOptions(filters: UserMediaQuerySchema) {
  return queryOptions({
    queryKey: ["user-media", filters],
    queryFn: () => getUserMediaFilterRecords(filters),
  });
}

export const userMediaCountOptions = queryOptions({
  queryKey: ["user-media", "count"],
  queryFn: getUserMediaCounts,
});

export const userMediaDropdownOptions = queryOptions({
  queryKey: ["user-media", "dropdowns"],
  queryFn: getUserMediaDropdowns,
});

export const dashboardStatOptions = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: getDashboardStats,
});

function calendarMonthRange(month: string) {
  const start = dayjs(`${month}-01`);

  return {
    from: start.format("YYYY-MM-DD"),
    to: start.endOf("month").format("YYYY-MM-DD"),
  };
}

export function getCalendarActivity(month: string) {
  const { from, to } = calendarMonthRange(month);

  return api<CalendarActivityResponse>(
    `/user-media/calendar/activity?from=${from}&to=${to}`,
  );
}

export function calendarActivityOptions(month: string) {
  return queryOptions({
    queryKey: ["calendar-activity", month],
    queryFn: () => getCalendarActivity(month),
  });
}

export const continueMediaFilters: UserMediaQuerySchema = {
  status: ["in_progress", "on_hold"],
  sort: "updatedAt",
  order: "desc",
};

export const continueMediaQueryOptions = userMediaFilterQueryOptions(
  continueMediaFilters,
);
