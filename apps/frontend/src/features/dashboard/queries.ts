import type { DashboardStatsResponse } from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";

export function getDashboardStats() {
  return api<DashboardStatsResponse>("/user-media/dashboard/stats");
}

export const dashboardStatOptions = queryOptions({
  queryKey: queryKeys.dashboardStats,
  queryFn: getDashboardStats,
});
