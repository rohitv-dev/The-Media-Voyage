import { queryKeys } from "#/lib/queryKeys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsSeen } from "../queries";

export function useMarkNotificationsSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsSeen,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.all,
      }),
  });
}
