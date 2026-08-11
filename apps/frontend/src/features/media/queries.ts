import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import dayjs from "dayjs";
import type {
  CalendarActivityResponse,
  GetTrashedUserMediaResponse,
  GetUserMediaResponse,
  GetUserMediaPageResponse,
  GetUserMediaSearchResponse,
  GetSemanticSearchResponse,
  MediaDetailedRecord,
  ReactionRecord,
  StatusHistoryRecord,
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

async function getUserMediaStatusHistory(id: string) {
  return api<StatusHistoryRecord[]>(`/user-media/${id}/status-history`);
}

export function statusHistoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.userMedia.statusHistory(id),
    queryFn: () => getUserMediaStatusHistory(id),
  });
}

async function getUserMediaFilterRecords(filters: UserMediaQuerySchema) {
  return api<GetUserMediaResponse>(
    `/user-media/filter${buildFilterQuery(filters)}`,
  );
}

function userMediaFilterQueryOptions(filters: UserMediaQuerySchema) {
  return queryOptions({
    queryKey: queryKeys.userMedia.filtered(filters),
    queryFn: () => getUserMediaFilterRecords(filters),
  });
}

const USER_MEDIA_PAGE_SIZE = 24;

async function getUserMediaFilterPageRecords(
  filters: UserMediaQuerySchema,
  page: number,
) {
  return api<GetUserMediaPageResponse>(
    `/user-media/filter/page${buildFilterQuery({
      ...filters,
      page,
      limit: USER_MEDIA_PAGE_SIZE,
    })}`,
  );
}

export function userMediaFilterInfiniteQueryOptions(
  filters: UserMediaQuerySchema,
  enabled = true,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.userMedia.filteredInfinite(filters),
    queryFn: ({ pageParam }) =>
      getUserMediaFilterPageRecords(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled,
  });
}

async function getUserMediaSearchRecords(search: string) {
  return api<GetUserMediaSearchResponse>(
    `/user-media/search?search=${encodeURIComponent(search)}`,
  );
}

export function userMediaSearchQueryOptions(search: string) {
  const normalizedSearch = search.trim();

  return queryOptions({
    queryKey: queryKeys.userMedia.search(normalizedSearch),
    queryFn: () => getUserMediaSearchRecords(normalizedSearch),
    enabled: normalizedSearch.length >= 2,
  });
}

async function getUserMediaSemanticSearchRecords(query: string) {
  return api<GetSemanticSearchResponse>(
    `/user-media/semantic-search?q=${encodeURIComponent(query)}`,
  );
}

export function userMediaSemanticSearchQueryOptions(query: string) {
  const normalizedQuery = query.trim();

  return queryOptions({
    queryKey: queryKeys.userMedia.semanticSearch(normalizedQuery),
    queryFn: () => getUserMediaSemanticSearchRecords(normalizedQuery),
    enabled: normalizedQuery.length >= 5,
  });
}

async function getDeletedUserMedia() {
  return api<GetTrashedUserMediaResponse>("/user-media/trash");
}

export const trashedUserMediaQueryOptions = queryOptions({
  queryKey: queryKeys.userMedia.trash,
  queryFn: getDeletedUserMedia,
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

// -- Calendar -----------------------------------------------------------------

function calendarMonthRange(month: string) {
  const start = dayjs(`${month}-01`);

  return {
    from: start.format("YYYY-MM-DD"),
    to: start.endOf("month").format("YYYY-MM-DD"),
  };
}

function getCalendarActivity(month: string) {
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
