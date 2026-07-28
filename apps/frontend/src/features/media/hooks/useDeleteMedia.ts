import { api, getApiErrorMessage } from "#/lib/api";
import { confirmDelete } from "#/utils/confirmModal";
import { queryKeys } from "#/lib/queryKeys";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Shared delete-media flow: confirm dialog, DELETE request, the standard set
 * of query invalidations, and a success/error notification. Used by every
 * surface that can delete a user-media entry (card menu, table row, form)
 * so the invalidation set only needs to be kept in sync in one place.
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) =>
      api<{ success: boolean }>(`/user-media/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userMedia.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collection.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collection.itemsAll,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collection.itemsDetailedAll,
        }),
      ]),
    onError: (error) =>
      showErrorNotification({
        title: "Delete failed",
        message: getApiErrorMessage(error),
      }),
  });

  const requestDelete = (
    id: string,
    title: string,
    onDeleted?: () => void,
  ) => {
    if (mutation.isPending) return;

    confirmDelete({
      title: "Delete media",
      message: `Are you sure you want to delete "${title}"? It will be removed from your library.`,
      onConfirm: () => {
        mutation.mutate(id, {
          onSuccess: () => {
            showSuccessNotification({
              message: `Deleted "${title}"`,
              autoClose: 1500,
            });
            onDeleted?.();
          },
        });
      },
    });
  };

  return {
    requestDelete,
    isDeletePending: mutation.isPending,
    pendingId: mutation.variables,
  };
}
