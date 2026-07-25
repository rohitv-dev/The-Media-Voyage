import { api } from "#/lib/api";
import { confirmDelete } from "#/utils/confirmModal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import type {
  MediaRecord,
  UserMediaQuickAction,
} from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useMediaCardActions(media: MediaRecord) {
  const queryClient = useQueryClient();

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
        message: error.message,
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-media"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
      ]),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api<{ success: boolean }>(`/user-media/${media.id}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-media"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["collection"] }),
        queryClient.invalidateQueries({ queryKey: ["collection-items"] }),
        queryClient.invalidateQueries({
          queryKey: ["collection-items-detailed"],
        }),
      ]);
      showSuccessNotification({
        message: `Deleted "${media.title}"`,
        autoClose: 1500,
      });
    },
    onError: (error) =>
      showErrorNotification({
        title: "Delete failed",
        message: error.message,
      }),
  });

  const runQuickAction = (action: UserMediaQuickAction) => {
    if (quickActionMutation.isPending || deleteMutation.isPending) return;

    quickActionMutation.mutate(action);
  };

  const requestDelete = () => {
    if (deleteMutation.isPending) return;

    confirmDelete({
      title: "Delete media",
      message: `Are you sure you want to delete "${media.title}"? It will be removed from your library.`,
      onConfirm: () => deleteMutation.mutate(),
    });
  };

  return {
    isActionPending: quickActionMutation.isPending || deleteMutation.isPending,
    isDeletePending: deleteMutation.isPending,
    requestDelete,
    runQuickAction,
  };
}
