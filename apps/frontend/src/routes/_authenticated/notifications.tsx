import { EmptyState } from "#/components/EmptyState";
import { NotificationItem } from "#/features/notifications/components/NotificationItem";
import { useMarkNotificationsSeen } from "#/features/notifications/hooks/useMarkNotificationsSeen";
import { notificationListQueryOptions } from "#/features/notifications/queries";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBellOff, IconRefresh } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

const notificationsSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authenticated/notifications")({
  validateSearch: notificationsSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(
      notificationListQueryOptions(deps.page ?? 1),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const page = search.page ?? 1;
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    ...notificationListQueryOptions(page),
    placeholderData: keepPreviousData,
  });

  const {
    mutate: markSeen,
    isPending: isMarkingSeen,
  } = useMarkNotificationsSeen();

  useEffect(() => {
    if (data?.unseenCount && !isMarkingSeen) {
      markSeen();
    }
  }, [data?.unseenCount, isMarkingSeen, markSeen]);

  const openNotification = (userMediaId: string | null) => {
    if (userMediaId) {
      navigate({ to: "/media/view/$id", params: { id: userMediaId } });
      return;
    }

    navigate({ to: "/friends" });
  };

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Stack gap={2}>
            <Title order={2}>Notifications</Title>
            <Text c="dimmed" size="sm">
              Likes, comments, and friend activity from across your library.
            </Text>
          </Stack>

          <Group gap="xs" wrap="nowrap">
            {isFetching && !isLoading && <Loader size="xs" />}
            {data && data.total > 0 && (
              <Badge variant="light" radius="xl">
                {data.total} {data.total === 1 ? "notification" : "notifications"}
              </Badge>
            )}
          </Group>
        </Group>

        {isLoading ? (
          <Center h={240}>
            <Loader />
          </Center>
        ) : isError ? (
          <EmptyState
            icon={<IconBellOff size={34} />}
            title="Notifications could not be loaded"
            description="Check your connection and try loading them again."
          >
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </EmptyState>
        ) : !data?.data.length ? (
          <EmptyState
            icon={<IconBellOff size={34} />}
            title="No notifications yet"
            description="Likes, comments, and friend requests will appear here."
          />
        ) : (
          <>
            <Card withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
              {data.data.map((notification, index) => (
                <Box
                  key={notification.id}
                  style={{
                    borderBottom:
                      index < data.data.length - 1
                        ? "1px solid var(--mantine-color-default-border)"
                        : undefined,
                  }}
                >
                  <NotificationItem
                    notification={notification}
                    onClick={() =>
                      openNotification(notification.userMediaId)
                    }
                  />
                </Box>
              ))}
            </Card>

            {totalPages > 1 && (
              <Group justify="center">
                <Pagination
                  value={page}
                  total={totalPages}
                  size="sm"
                  siblings={1}
                  onChange={(nextPage) =>
                    navigate({
                      to: "/notifications",
                      search: {
                        page: nextPage === 1 ? undefined : nextPage,
                      },
                    })
                  }
                />
              </Group>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
