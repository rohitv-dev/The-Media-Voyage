import {
  userMediaCountOptions,
  userMediaFilterQueryOptions,
} from "#/features/media/queries";
import {
  Chip,
  Container,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  useQuery,
  useSuspenseQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MediaCard } from "#/features/media/components/MediaCard";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { MediaCardSkeleton } from "#/features/media/components/MediaCardSkeleton";
import { showErrorNotification } from "#/utils/notifications";
import { capitalizeWords } from "#/utils/stringFunctions";
import {
  mediaTypeEnumValues,
  statusEnumValues,
} from "@media-voyage/shared/userMediaSchema";

export const Route = createFileRoute("/_authenticated/media/")({
  validateSearch: userMediaQuerySchema,
  loaderDeps: ({ search: { favorite, search, status, type } }) => ({
    status,
    type,
    favorite,
    search,
  }),
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(userMediaCountOptions);
    queryClient.ensureQueryData(userMediaFilterQueryOptions(deps));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { data, isPending, isFetching, isError } = useQuery({
    ...userMediaFilterQueryOptions(search),
    placeholderData: keepPreviousData,
  });
  const { data: counts } = useSuspenseQuery(userMediaCountOptions);
  const navigate = useNavigate();
  const [filters, setFilters] = useState<UserMediaQuerySchema>();

  useEffect(() => {
    if (filters) {
      navigate({ to: ".", search: filters });
    } else {
      navigate({ to: "." });
    }
  }, [filters]);

  useEffect(() => {
    if (isError) {
      showErrorNotification({
        message: "Failed to load data",
        title: "Please try again later",
      });
    }
  }, [isError]);

  const total = useMemo(
    () => counts.reduce((acc, count) => acc + count.count, 0),
    [counts],
  );

  return (
    <Container size="xl" pt="md" pb="md">
      <Stack gap="xs">
        <Group justify="apart" align="center" mb="md">
          <Stack gap={2}>
            <Group>
              <Text size="lg" fw={700}>
                Library
              </Text>
              {isFetching && <Loader size="xs" />}
            </Group>
            <Text color="dimmed" size="sm">
              Click any row to view the full details, or use the action button
              to update.
            </Text>
          </Stack>
        </Group>

        <Group pb="sm" justify="space-between" align="center">
          <Group visibleFrom="md">
            <Chip
              checked={!filters?.status}
              onChange={() => setFilters({ ...filters, status: undefined })}
            >
              All ({total})
            </Chip>

            {counts
              .sort((a, b) => b.count - a.count)
              .map((count) => (
                <Chip
                  key={count.status}
                  checked={filters?.status === count.status}
                  onChange={() =>
                    setFilters({
                      ...filters,
                      status: count.status as UserMediaQuerySchema["status"],
                    })
                  }
                >
                  {capitalizeWords(count.status)} ({count.count})
                </Chip>
              ))}
          </Group>
          <Group gap="xs">
            <Select
              hiddenFrom="md"
              placeholder="Filter by status"
              value={filters?.status}
              onChange={(value) => {
                if (value === "All") {
                  setFilters({ ...filters, status: undefined });
                } else {
                  setFilters({
                    ...filters,
                    status: value as UserMediaQuerySchema["status"],
                  });
                }
              }}
              data={[
                { label: "All", value: "All" },
                ...statusEnumValues.map((value) => ({
                  label: `${capitalizeWords(value)} (${counts.find((c) => c.status === value)?.count ?? 0})`,
                  value,
                })),
              ]}
            />
            <Select
              placeholder="Filter by type"
              value={filters?.type}
              onChange={(value) => {
                if (value === "All") {
                  setFilters({ ...filters, type: undefined });
                } else {
                  setFilters({
                    ...filters,
                    type: value as UserMediaQuerySchema["type"],
                  });
                }
              }}
              data={[
                { label: "All", value: "All" },
                ...mediaTypeEnumValues.map((value) => ({
                  label: capitalizeWords(value),
                  value,
                })),
              ]}
            />
          </Group>
        </Group>
        <SimpleGrid
          cols={{
            base: 1,
            sm: 2,
            lg: 3,
            xl: 4,
          }}
        >
          {isPending
            ? Array.from({ length: 8 }).map((_, i) => (
                <MediaCardSkeleton key={i} />
              ))
            : data!.data.map((record) => (
                <MediaCard
                  key={record.id}
                  media={record}
                  onView={(id) =>
                    navigate({ to: "/media/view/$id", params: { id } })
                  }
                  onEdit={(id) =>
                    navigate({ to: "/media/update/$id", params: { id } })
                  }
                />
              ))}
        </SimpleGrid>
        {/* <MediaTable data={data.data} /> */}
      </Stack>
    </Container>
  );
}
