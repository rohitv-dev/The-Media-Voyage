import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { queryOptions } from "@tanstack/react-query";
import dayjs from "dayjs";
import type {
  CalendarActivityResponse,
  DashboardStatsResponse,
  UserMediaCounts,
  GetTrashedUserMediaResponse,
  GetUserMediaResponse,
  MediaDetailedRecord,
  ReactionRecord,
  UserMediaQuerySchema,
  UserMediaDropdowns,
  MediaPickerQuery,
  MediaPickerRecord,
} from "@media-voyage/shared/api";

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

// -- User media ---------------------------------------------------------------

async function getUserMedia() {
  return api<GetUserMediaResponse>("/user-media");
}

export const userMediaQueryOptions = queryOptions({
  queryKey: queryKeys.userMedia.all,
  queryFn: getUserMedia,
});

async function getUserMediaDetailedRecord(id: string) {
  return api<MediaDetailedRecord & { reactions: ReactionRecord[] }>(
    `/user-media/${id}`,
  );
}

export function userMediaDetailedOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.userMedia.detail(id),
    queryFn: () => getUserMediaDetailedRecord(id),
  });
}

async function getUserMediaFilterRecords(filters: UserMediaQuerySchema) {
  return api<GetUserMediaResponse>(
    `/user-media/filter${buildFilterQuery(filters)}`,
  );
}

export function userMediaFilterQueryOptions(filters: UserMediaQuerySchema) {
  return queryOptions({
    queryKey: queryKeys.userMedia.filtered(filters),
    queryFn: () => getUserMediaFilterRecords(filters),
  });
}

async function getDeletedUserMedia() {
  return api<GetTrashedUserMediaResponse>("/user-media/trash");
}

export const trashedUserMediaQueryOptions = queryOptions({
  queryKey: queryKeys.userMedia.trash,
  queryFn: getDeletedUserMedia,
});

async function getUserMediaCounts() {
  return api<UserMediaCounts>("/user-media/counts");
}

export const userMediaCountOptions = queryOptions({
  queryKey: queryKeys.userMedia.count,
  queryFn: getUserMediaCounts,
});

async function getUserMediaDropdowns() {
  return api<UserMediaDropdowns>("/user-media/dropdowns");
}

export const userMediaDropdownOptions = queryOptions({
  queryKey: queryKeys.userMedia.dropdowns,
  queryFn: getUserMediaDropdowns,
});

export const continueMediaFilters: UserMediaQuerySchema = {
  status: ["in_progress", "on_hold"],
  sort: "updatedAt",
  order: "desc",
};

export const continueMediaQueryOptions =
  userMediaFilterQueryOptions(continueMediaFilters);

// -- Dashboard ----------------------------------------------------------------

export function getDashboardStats() {
  return api<DashboardStatsResponse>("/user-media/dashboard/stats");
}

export const dashboardStatOptions = queryOptions({
  queryKey: queryKeys.dashboardStats,
  queryFn: getDashboardStats,
});

// -- Calendar -----------------------------------------------------------------

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
    queryKey: queryKeys.calendarActivity(month),
    queryFn: () => getCalendarActivity(month),
  });
}

// -- Media picker -------------------------------------------------------------

export function pickPlannedMedia(filters: MediaPickerQuery) {
  return api<MediaPickerRecord | null>(
    `/user-media/pick${buildFilterQuery(filters)}`,
  );
}
