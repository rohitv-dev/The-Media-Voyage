import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import type {
  CreateFriendRecommendationInput,
  CreateRecommendationResponse,
  DismissSystemRecommendationInput,
  DismissSystemRecommendationResponse,
  RecommendationDetail,
  RecommendationResolutionResponse,
  ResolveRecommendationInput,
  SystemRecommendationPreviewResponse,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";

export function recommendationDetailOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.recommendations.detail(id),
    queryFn: () => api<RecommendationDetail>(`/recommendations/${id}`),
  });
}

export const systemRecommendationPreviewOptions = queryOptions({
  queryKey: queryKeys.recommendations.preview,
  queryFn: () =>
    api<SystemRecommendationPreviewResponse>("/recommendations/system/preview"),
  enabled: false,
  retry: false,
  gcTime: Infinity,
});

export function createFriendRecommendation(
  input: CreateFriendRecommendationInput,
) {
  return api<CreateRecommendationResponse>("/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function resolveRecommendation(
  id: string,
  input: ResolveRecommendationInput,
) {
  return api<RecommendationResolutionResponse>(
    `/recommendations/${id}/resolve`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function dismissSystemRecommendation(
  input: DismissSystemRecommendationInput,
) {
  return api<DismissSystemRecommendationResponse>(
    "/recommendations/system/dismiss",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}
