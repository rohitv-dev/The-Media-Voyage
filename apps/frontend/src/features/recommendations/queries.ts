import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import type {
  CreateFriendRecommendationInput,
  CreateRecommendationResponse,
  RecommendationDetail,
  RecommendationResolutionResponse,
  ResolveRecommendationInput,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";

export function recommendationDetailOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.recommendations.detail(id),
    queryFn: () => api<RecommendationDetail>(`/recommendations/${id}`),
  });
}

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
