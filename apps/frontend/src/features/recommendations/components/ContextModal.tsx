import { getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import { DetailContent } from "./DetailContent";
import type { DetailContentProps } from "./DetailContent";
import type {
  RecommendationResolutionResponse,
  ResolveRecommendationInput,
} from "@media-voyage/shared/api";
import { modals } from "@mantine/modals";
import type { ContextModalProps as MantineContextModalProps } from "@mantine/modals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { recommendationDetailOptions, resolveRecommendation } from "../queries";

export type ContextModalProps = {
  recommendationId: string;
};

function outcomeMessage(result: RecommendationResolutionResponse) {
  switch (result.outcome) {
    case "added_to_library":
      return "Added to your library.";
    case "already_completed":
      return "Saved your response.";
    case "not_interested":
      return "Saved as not interested.";
    case "dismissed":
      return "Dismissed recommendation.";
  }
}

export function ContextModal({
  context,
  id,
  innerProps,
}: MantineContextModalProps<ContextModalProps>) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detailQuery = useQuery(
    recommendationDetailOptions(innerProps.recommendationId),
  );
  const { closeModal, updateContextModal } = context;

  const resolveMutation = useMutation({
    mutationFn: (input: ResolveRecommendationInput) =>
      resolveRecommendation(innerProps.recommendationId, input),
    onSuccess: async (result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userMedia.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.all,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.recommendations.detail(
            innerProps.recommendationId,
          ),
        }),
      ]);

      showSuccessNotification({ message: outcomeMessage(result) });
      closeModal(id);

      const recipientUserMediaId = result.recipientUserMediaId;
      const shouldOpenLibrary =
        recipientUserMediaId &&
        (result.outcome === "added_to_library" || input.addToLibrary);

      if (shouldOpenLibrary && recipientUserMediaId) {
        navigate({
          to: "/media/update/$id",
          params: { id: recipientUserMediaId },
        });
      }
    },
    onError: (error) => {
      showErrorNotification({
        title: "Could not save recommendation response",
        message: getApiErrorMessage(error),
      });
    },
  });

  useEffect(() => {
    updateContextModal({
      modalId: id,
      closeOnEscape: !resolveMutation.isPending,
      closeOnClickOutside: !resolveMutation.isPending,
      closeButtonProps: { disabled: resolveMutation.isPending },
    });
  }, [id, resolveMutation.isPending, updateContextModal]);

  const contentProps: DetailContentProps = {
    detail: detailQuery.data,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    resolvePending: resolveMutation.isPending,
    resolveError: resolveMutation.error
      ? getApiErrorMessage(resolveMutation.error)
      : undefined,
    onResolve: (input) => resolveMutation.mutate(input),
    onOpenLibrary: async (userMediaId) => {
      await navigate({
        to: "/media/update/$id",
        params: { id: userMediaId },
      });
      closeModal(id);
    },
  };

  return <DetailContent {...contentProps} />;
}

export const recommendationModals = {
  recommendation: ContextModal,
};

declare module "@mantine/modals" {
  interface MantineModalsOverride {
    modals: typeof recommendationModals;
  }
}

export function openRecommendationModal(recommendationId: string) {
  return modals.openContextModal({
    modal: "recommendation",
    title: "Recommendation",
    centered: true,
    size: "lg",
    innerProps: { recommendationId },
  });
}
