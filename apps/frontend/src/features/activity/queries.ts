import type {
  ActivityFilters,
  ActivityListQuery,
  ActivityListResponse,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import dayjs from "dayjs";

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
