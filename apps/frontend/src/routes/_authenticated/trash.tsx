import { EmptyState } from "#/components/EmptyState";
import { getTypeIcon } from "#/features/media/functions";
import { trashedUserMediaQueryOptions } from "#/features/media/queries";
import { api, getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { confirmDelete } from "#/utils/confirmModal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  ActionIcon,
  Avatar,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconRestore, IconTrash, IconTrashOff } from "@tabler/icons-react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";

export const Route = createFileRoute("/_authenticated/trash")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(trashedUserMediaQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(trashedUserMediaQueryOptions);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.userMedia.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
    ]);

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ success: boolean }>(`/user-media/${id}/restore`, {
        method: "POST",
      }),
    onSuccess: async (_data, id) => {
      await invalidate();
      const title = data.data.find((entry) => entry.id === id)?.title;
      showSuccessNotification({
        message: title ? `Restored "${title}"` : "Restored",
        autoClose: 1500,
      });
    },
    onError: (error) =>
      showErrorNotification({
        title: "Restore failed",
        message: getApiErrorMessage(error),
      }),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      api<{ success: boolean }>(`/user-media/${id}/permanent`, {
        method: "DELETE",
      }),
    onSuccess: async (_data, id) => {
      await invalidate();
      const title = data.data.find((entry) => entry.id === id)?.title;
      showSuccessNotification({
        message: title ? `Permanently deleted "${title}"` : "Permanently deleted",
        autoClose: 1500,
      });
    },
    onError: (error) =>
      showErrorNotification({
        title: "Permanent delete failed",
        message: getApiErrorMessage(error),
      }),
  });

  const requestPermanentDelete = (id: string, title: string) => {
    confirmDelete({
      title: "Delete permanently",
      message: `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      confirmLabel: "Delete forever",
      onConfirm: () => permanentDeleteMutation.mutate(id),
    });
  };

  return (
    <Container size="lg" pt="md" pb="md">
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={2}>Trash</Title>
          <Text c="dimmed" size="sm">
            Entries you've deleted from your library. Restore them or delete
            them permanently.
          </Text>
        </Stack>

        {data.data.length === 0 ? (
          <EmptyState
            icon={<IconTrashOff size={36} />}
            title="Trash is empty"
            description="Entries you delete from your library will show up here until you restore or permanently delete them."
          />
        ) : (
          <Stack gap="xs">
            {data.data.map((entry) => (
              <Card key={entry.id} withBorder radius="md" p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Avatar
                      src={entry.imageUrl}
                      radius="sm"
                      size={40}
                    >
                      {getTypeIcon(entry.type)}
                    </Avatar>
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {entry.title}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Deleted{" "}
                        {entry.deletedAt
                          ? dayjs(entry.deletedAt).format("MMM D, YYYY")
                          : "recently"}
                      </Text>
                    </Stack>
                  </Group>

                  <Group gap="xs" wrap="nowrap">
                    <Tooltip label="Restore" withArrow>
                      <ActionIcon
                        variant="light"
                        color="teal"
                        size="lg"
                        aria-label="Restore"
                        loading={restoreMutation.isPending}
                        onClick={() => restoreMutation.mutate(entry.id)}
                      >
                        <IconRestore size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete permanently" withArrow>
                      <ActionIcon
                        variant="light"
                        color="red"
                        size="lg"
                        aria-label="Delete permanently"
                        loading={permanentDeleteMutation.isPending}
                        onClick={() =>
                          requestPermanentDelete(entry.id, entry.title)
                        }
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
