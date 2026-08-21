import { EmptyState } from "#/components/EmptyState";
import { ActivityItem } from "#/features/activity/components/ActivityItem";
import { activityListQueryOptions } from "#/features/activity/queries";
import type { ActivityRecord } from "@media-voyage/shared/api";
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
import { IconHistory, IconRefresh } from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const activitySearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: activitySearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(activityListQueryOptions(deps.page ?? 1));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const page = search.page ?? 1;
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...activityListQueryOptions(page),
    placeholderData: keepPreviousData,
  });

  const openActivity = (activity: ActivityRecord) => {
    if (activity.userMediaId) {
      navigate({
        to: "/media/view/$id",
        params: { id: activity.userMediaId },
      });
    }
  };

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;

  return (
    <Container size="md" py="md">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Stack gap={2}>
            <Title order={2}>Personal Activity</Title>
            <Text c="dimmed" size="sm">
              A private timeline of your meaningful library changes.
            </Text>
          </Stack>

          <Group gap="xs" wrap="nowrap">
            {isFetching && !isLoading && <Loader size="xs" />}
            {data && data.total > 0 && (
              <Badge variant="light" radius="xl">
                {data.total} {data.total === 1 ? "entry" : "entries"}
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
            icon={<IconHistory size={34} />}
            title="Activity could not be loaded"
            description="Check your connection and try loading it again."
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
            icon={<IconHistory size={34} />}
            title="No activity yet"
            description="Meaningful changes to your library will appear here."
          />
        ) : (
          <>
            <Card withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
              {data.data.map((activity, index) => (
                <Box
                  key={activity.id}
                  style={{
                    borderBottom:
                      index < data.data.length - 1
                        ? "1px solid var(--mantine-color-default-border)"
                        : undefined,
                  }}
                >
                  <ActivityItem
                    activity={activity}
                    onClick={
                      activity.userMediaId
                        ? () => openActivity(activity)
                        : undefined
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
                      to: "/activity",
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
