import { EmptyState } from "#/components/EmptyState";
import { ActivityItem } from "#/features/activity/components/ActivityItem";
import { activityListQueryOptions } from "#/features/activity/queries";
import { PHONE_WIDTH_QUERY } from "#/theme/breakpoints";
import { capitalizeWords } from "#/utils/strings";
import { activityFilterSchema } from "@media-voyage/shared/api";
import type { ActivityFilters, ActivityRecord } from "@media-voyage/shared/api";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Container,
  Group,
  Loader,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconFilter,
  IconHistory,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const activitySearchSchema = activityFilterSchema.extend({
  page: z.coerce.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: activitySearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(activityListQueryOptions(deps));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const page = search.page ?? 1;
  const [filters, setFilters] = useState<ActivityFilters>(() =>
    activityFilterSchema.parse(search),
  );
  const [filtersOpened, { toggle: toggleFilters, close: closeFilters }] =
    useDisclosure();
  const isMobile = useMediaQuery(PHONE_WIDTH_QUERY, undefined, {
    getInitialValueInEffect: false,
  });
  const activeFilterCount = [
    search.action,
    search.type,
    search.search,
    search.from || search.to,
  ].filter(Boolean).length;
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    ...activityListQueryOptions(search),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setFilters(activityFilterSchema.parse(search));
  }, [search]);

  const resetFilters = () => {
    setFilters({});
    closeFilters();
    navigate({ to: "/activity", search: {} });
  };

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

        <Card withBorder radius="md" p="sm">
          <Stack gap="sm">
            {isMobile ? (
              <Button
                variant="light"
                leftSection={<IconFilter size={16} />}
                aria-expanded={filtersOpened}
                aria-controls="activity-filters"
                onClick={toggleFilters}
              >
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
            ) : (
              <Text size="sm" fw={600}>
                Filters
              </Text>
            )}

            <Collapse
              expanded={!isMobile || filtersOpened}
              id="activity-filters"
            >
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextFilters = {
                    ...filters,
                    search: filters.search?.trim() || undefined,
                  };
                  setFilters(nextFilters);
                  closeFilters();
                  navigate({
                    to: "/activity",
                    search: { ...nextFilters, page: undefined },
                  });
                }}
              >
                <Stack gap="sm">
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                    <TextInput
                      label="Title"
                      placeholder="Search activity titles"
                      size="xs"
                      leftSection={<IconSearch size={14} />}
                      value={filters.search ?? ""}
                      onChange={(event) =>
                        setFilters({
                          ...filters,
                          search: event.currentTarget.value,
                        })
                      }
                    />
                    <Select
                      label="Action"
                      placeholder="All Actions"
                      size="xs"
                      clearable
                      data={activityFilterSchema.shape.action
                        .unwrap()
                        .options.map((value) => ({
                          value,
                          label: capitalizeWords(value.replace("media_", "")),
                        }))}
                      value={filters.action ?? null}
                      onChange={(value) =>
                        setFilters({
                          ...filters,
                          action: activityFilterSchema.shape.action.parse(
                            value ?? undefined,
                          ),
                        })
                      }
                    />
                    <Select
                      label="Media Type"
                      placeholder="All Types"
                      size="xs"
                      clearable
                      data={activityFilterSchema.shape.type
                        .unwrap()
                        .options.map((value) => ({
                          value,
                          label: capitalizeWords(value),
                        }))}
                      value={filters.type ?? null}
                      onChange={(value) =>
                        setFilters({
                          ...filters,
                          type: activityFilterSchema.shape.type.parse(
                            value ?? undefined,
                          ),
                        })
                      }
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                    <DateInput
                      label="Activity From"
                      placeholder="From"
                      size="xs"
                      clearable
                      value={filters.from ?? null}
                      maxDate={filters.to}
                      onChange={(value) =>
                        setFilters({ ...filters, from: value ?? undefined })
                      }
                    />
                    <DateInput
                      label="Activity To"
                      placeholder="To"
                      size="xs"
                      clearable
                      value={filters.to ?? null}
                      minDate={filters.from}
                      onChange={(value) =>
                        setFilters({ ...filters, to: value ?? undefined })
                      }
                    />
                  </SimpleGrid>

                  <Group justify="flex-end" gap="xs">
                    <Button
                      size="xs"
                      variant="light"
                      type="button"
                      onClick={resetFilters}
                    >
                      Reset Filters
                    </Button>
                    <Button size="xs" type="submit">
                      Apply Filters
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Collapse>
          </Stack>
        </Card>

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
            title={
              activeFilterCount > 0 ? "No matching activity" : "No activity yet"
            }
            description={
              activeFilterCount > 0
                ? "Try adjusting or resetting your filters."
                : "Meaningful changes to your library will appear here."
            }
          >
            {activeFilterCount > 0 && (
              <Button variant="light" onClick={resetFilters}>
                Reset Filters
              </Button>
            )}
          </EmptyState>
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
                      search: (previous) => ({
                        ...previous,
                        page: nextPage === 1 ? undefined : nextPage,
                      }),
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
