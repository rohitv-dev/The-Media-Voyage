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
 * when nothing is set). Blank values and empty arrays are skipped; arrays are
 * JSON-encoded to match what the user-media endpoints expect.
 */
export function buildFilterQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    params.set(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value),
    );
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

// -- User media ---------------------------------------------------------------

export function userMediaDetailedOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.userMedia.detail(id),
    queryFn: () =>
      api<MediaDetailedRecord & { reactions: ReactionRecord[] }>(
        `/user-media/${id}`,
      ),
  });
}

export function statusHistoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.userMedia.statusHistory(id),
    queryFn: () =>
      api<StatusHistoryRecord[]>(`/user-media/${id}/status-history`),
  });
}

function userMediaFilterQueryOptions(filters: UserMediaQuerySchema) {
  return queryOptions({
    queryKey: queryKeys.userMedia.filtered(filters),
    queryFn: () =>
      api<GetUserMediaResponse>(
        `/user-media/filter${buildFilterQuery(filters)}`,
      ),
  });
}

const USER_MEDIA_PAGE_SIZE = 24;

export function userMediaFilterInfiniteQueryOptions(
  filters: UserMediaQuerySchema,
  enabled = true,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.userMedia.filteredInfinite(filters),
    queryFn: ({ pageParam }) =>
      api<GetUserMediaPageResponse>(
        `/user-media/filter/page${buildFilterQuery({
          ...filters,
          page: pageParam,
          limit: USER_MEDIA_PAGE_SIZE,
        })}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled,
  });
}

export function userMediaSearchQueryOptions(search: string) {
  const normalizedSearch = search.trim();

  return queryOptions({
    queryKey: queryKeys.userMedia.search(normalizedSearch),
    queryFn: () =>
      api<GetUserMediaSearchResponse>(
        `/user-media/search?search=${encodeURIComponent(normalizedSearch)}`,
      ),
    enabled: normalizedSearch.length >= 2,
  });
}

export function userMediaSemanticSearchQueryOptions(query: string) {
  const normalizedQuery = query.trim();

  return queryOptions({
    queryKey: queryKeys.userMedia.semanticSearch(normalizedQuery),
    queryFn: () =>
      api<GetSemanticSearchResponse>(
        `/user-media/semantic-search?q=${encodeURIComponent(normalizedQuery)}`,
      ),
    enabled: normalizedQuery.length >= 5,
  });
}

export const trashedUserMediaQueryOptions = queryOptions({
  queryKey: queryKeys.userMedia.trash,
  queryFn: () => api<GetTrashedUserMediaResponse>("/user-media/trash"),
});

export const userMediaDropdownOptions = queryOptions({
  queryKey: queryKeys.userMedia.dropdowns,
  queryFn: () => api<UserMediaDropdowns>("/user-media/dropdowns"),
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

export function calendarActivityOptions(month: string) {
  return queryOptions({
    queryKey: queryKeys.calendarActivity(month),
    queryFn: () => {
      const { from, to } = calendarMonthRange(month);
      return api<CalendarActivityResponse>(
        `/user-media/calendar/activity?from=${from}&to=${to}`,
      );
    },
  });
}

// -- Media picker -------------------------------------------------------------

export function pickPlannedMedia(filters: MediaPickerQuery) {
  return api<MediaPickerRecord | null>(
    `/user-media/pick${buildFilterQuery(filters)}`,
  );
}
