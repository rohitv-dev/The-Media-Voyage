import type { DashboardStatsResponse } from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";

export const dashboardStatOptions = queryOptions({
  queryKey: queryKeys.dashboardStats,
  queryFn: () => api<DashboardStatsResponse>("/user-media/dashboard/stats"),
});
