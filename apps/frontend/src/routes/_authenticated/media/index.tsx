import {
  userMediaCountOptions,
  userMediaFilterQueryOptions,
} from "#/features/media/queries";
import {
  Box,
  Chip,
  Container,
  Group,
  Loader,
  SegmentedControl,
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
import { useEffect, useMemo } from "react";
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
import { MediaTable } from "#/features/media/components/MediaTable";
import { IconGridDots, IconList } from "@tabler/icons-react";
import { useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";

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
  const isMdDown = useMediaQuery("(max-width: 47.99em)");
  const [view, setView] = useLocalStorage({
    key: "media-view",
    defaultValue: "grid",
  });

  useEffect(() => {
    if (isError) {
      showErrorNotification({
        message: "Failed to load data",
        title: "Please try again later",
      });
    }
  }, [isError]);

  useEffect(() => {
    if (isMdDown && view !== "grid") {
      setView("grid");
    }
  }, [isMdDown, view, setView]);

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
              checked={!search.status}
              onChange={() =>
                navigate({
                  to: "/media",
                  search: (prev) => ({ ...prev, status: undefined }),
                })
              }
            >
              All ({total})
            </Chip>

            {counts
              .sort((a, b) => b.count - a.count)
              .map((count) => (
                <Chip
                  key={count.status}
                  checked={search.status === count.status}
                  onChange={() =>
                    navigate({
                      to: "/media",
                      search: (prev) => ({
                        ...prev,
                        status: count.status,
                      }),
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
              value={search.status}
              onChange={(value) => {
                if (value === "All") {
                  navigate({
                    to: "/media",
                    search: (prev) => ({
                      ...prev,
                      status: undefined,
                    }),
                  });
                } else {
                  navigate({
                    to: "/media",
                    search: (prev) => ({
                      ...prev,
                      status: value as UserMediaQuerySchema["status"],
                    }),
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
              value={search.type}
              onChange={(value) => {
                if (value === "All") {
                  navigate({
                    to: "/media",
                    search: (prev) => ({
                      ...prev,
                      type: undefined,
                    }),
                  });
                } else {
                  navigate({
                    to: "/media",
                    search: (prev) => ({
                      ...prev,
                      type: value as UserMediaQuerySchema["type"],
                    }),
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
            <SegmentedControl
              visibleFrom="md"
              size="sm"
              data={[
                {
                  label: <IconGridDots />,
                  value: "grid",
                },
                {
                  label: <IconList />,
                  value: "list",
                },
              ]}
              value={view}
              onChange={setView}
            />
          </Group>
        </Group>
        <SimpleGrid
          hidden={view !== "grid"}
          cols={{
            base: 1,
            sm: 2,
            lg: 3,
            xl: 4,
          }}
        >
          <AnimatePresence mode="popLayout">
            {data?.data.map((record) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{
                  duration: 0.2,
                  layout: {
                    duration: 0.25,
                  },
                }}
              >
                <MediaCard
                  key={record.id}
                  media={record}
                  onView={(id) =>
                    navigate({
                      to: "/media/view/$id",
                      params: { id },
                      viewTransition: true,
                    })
                  }
                  onEdit={(id) =>
                    navigate({ to: "/media/update/$id", params: { id } })
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SimpleGrid>
        {/* <SimpleGrid
          hidden={view !== "grid"}
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
        </SimpleGrid> */}
        <Box hidden={view !== "list"}>
          <MediaTable data={data?.data || []} />
        </Box>
      </Stack>
    </Container>
  );
}
