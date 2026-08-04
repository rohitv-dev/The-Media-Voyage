import { api, getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import type {
  MediaRecord,
  UserMediaQuickAction,
} from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDeleteMedia } from "./useDeleteMedia";

export function useMediaCardActions(media: Pick<MediaRecord, "id" | "title">) {
  const queryClient = useQueryClient();
  const { requestDelete: requestDeleteMedia, isDeletePending } =
    useDeleteMedia();

  const quickActionMutation = useMutation({
    mutationFn: (action: UserMediaQuickAction) =>
      api<MediaRecord>(`/user-media/${media.id}/quick-actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      }),
    onSuccess: () =>
      showSuccessNotification({
        message: "Updated",
        autoClose: 1500,
      }),
    onError: (error) =>
      showErrorNotification({
        title: "Quick action failed",
        message: getApiErrorMessage(error),
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userMedia.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
      ]),
  });

  const runQuickAction = (action: UserMediaQuickAction) => {
    if (quickActionMutation.isPending || isDeletePending) return;

    quickActionMutation.mutate(action);
  };

  const requestDelete = () => requestDeleteMedia(media.id, media.title);

  return {
    isActionPending: quickActionMutation.isPending || isDeletePending,
    isDeletePending,
    requestDelete,
    runQuickAction,
  };
}
