import type {
  DashboardStatsResponse,
  TmdbTrendingResponse,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";

export const dashboardStatOptions = queryOptions({
  queryKey: queryKeys.dashboardStats,
  queryFn: () => api<DashboardStatsResponse>("/user-media/dashboard/stats"),
});

export const dashboardTrendingOptions = queryOptions({
  queryKey: queryKeys.dashboardTrending,
  queryFn: () => api<TmdbTrendingResponse>("/user-media/dashboard/trending"),
});
