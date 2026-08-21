import type {
  ActivityListQuery,
  ActivityListResponse,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";

async function getActivity({ page, limit }: ActivityListQuery) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return api<ActivityListResponse>(`/activity?${params.toString()}`);
}

export function activityListQueryOptions(page: number, limit = 20) {
  return queryOptions({
    queryKey: queryKeys.activity.list(page, limit),
    queryFn: () => getActivity({ page, limit }),
  });
}
