import {
  userMediaDropdownOptions,
  userMediaFilterInfiniteQueryOptions,
} from "#/features/media/queries";
import {
  Box,
  Button,
  Container,
  Drawer,
  Flex,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  SegmentedControl,
  Text,
  Title,
} from "@mantine/core";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MediaCard } from "#/features/media/components/MediaCard";
import { MediaCardSkeleton } from "#/features/media/components/MediaCardSkeleton";
import { EmptyState } from "#/components/EmptyState";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { getApiErrorMessage } from "#/lib/api";
import { showErrorNotification } from "#/lib/notifications";
import { useDisclosure, useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { gridItemMotionProps } from "#/theme/motion";
import { MediaFilterCard } from
  "#/features/media/components/MediaFilters/MediaFilterCard";
import { MediaPickerModal } from "#/features/media/components/MediaPickerModal";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import {
  IconDice5,
  IconFilter,
  IconLayoutGrid,
  IconMovie,
  IconPlus,
  IconTable,
} from "@tabler/icons-react";
import { MediaAppliedFilters } from
  "#/features/media/components/MediaFilters/MediaAppliedFilters";
import { MediaTable } from "#/features/media/components/MediaTable";
import { useFilterPresets } from "#/features/media/hooks/useFilterPresets";
import { FilterPresetsMenu } from
  "#/features/media/components/MediaFilters/FilterPresetsMenu";

type ViewType = "grid" | "table";

export const Route = createFileRoute("/_authenticated/media/")({
  validateSearch: userMediaQuerySchema,
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(userMediaDropdownOptions);
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { data: dropdowns } = useQuery(userMediaDropdownOptions);
  const { data: collections } = useQuery(collectionQueryOptions);
  const {
    data,
    isFetching,
    isPending,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery(userMediaFilterInfiniteQueryOptions(search));
  const navigate = useNavigate();
  const reduceMotion = useAppReducedMotion();
  const isMdDown = useMediaQuery("(max-width: 47.99em)");
  const [view, setView] = useLocalStorage<ViewType>({
    key: "media-view",
    defaultValue: "grid",
  });

  const [opened, { open, close }] = useDisclosure();
  const [pickerOpened, { open: openPicker, close: closePicker }] =
    useDisclosure();

  const [filters, setFilters] = useState<UserMediaQuerySchema>(search);
  const { presets, savePreset, deletePreset } = useFilterPresets();
  const skipNextSearchSyncRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const records = data?.pages.flatMap((page) => page.data) ?? [];
  const isInitialLoading = isPending && !data;

  const hasAppliedFilters = Boolean(
    search.search ||
    search.favorite ||
    search.status?.length ||
    search.type?.length ||
    search.minRating !== undefined ||
    search.maxRating !== undefined ||
    search.createdFrom ||
    search.createdTo ||
    search.sources?.length ||
    search.tags?.length,
  );

  const updateFilters = (newFilters: UserMediaQuerySchema) => {
    setFilters(newFilters);
  };

  const applyFilters = () => {
    skipNextSearchSyncRef.current = true;
    navigate({ to: "/media", search: filters });
    close();
  };

  const updateAndApplyFilters = (newFilters: UserMediaQuerySchema) => {
    updateFilters(newFilters);
    skipNextSearchSyncRef.current = true;
    navigate({ to: "/media", search: newFilters });
    close();
  };

  const resetFilters = () => {
    setFilters({
      favorite: undefined,
      search: undefined,
      status: [],
      type: [],
      minRating: undefined,
      maxRating: undefined,
      createdFrom: undefined,
      createdTo: undefined,
      sources: [],
      tags: [],
      sort: "updatedAt",
      order: "desc",
    });
    skipNextSearchSyncRef.current = true;
    close();
    navigate({ to: "/media", search: undefined });
  };

  useEffect(() => {
    if (isError) {
      showErrorNotification({
        message: getApiErrorMessage(error, "Failed to load data"),
        title: "Please try again later",
      });
    }
  }, [error, isError]);

  useEffect(() => {
    if (isMdDown && view !== "grid") {
      setView("grid");
    }
  }, [isMdDown, view, setView]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;

    if (
      !sentinel ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "160px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);

  useEffect(() => {
    if (skipNextSearchSyncRef.current) {
      skipNextSearchSyncRef.current = false;
      return;
    }
    setFilters(search);
  }, [search]);

  return (
    <Container fluid pt="md" pb="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Group gap="xs">
              <Title order={2}>Library</Title>
              {isFetching && !isFetchingNextPage && <Loader size="xs" />}
            </Group>
            <Text c="dimmed" size="sm">
              Select an entry to view the full details, or use the action button
              to update.
            </Text>
          </Stack>

          <Group gap="xs">
            {!isMdDown && (
              <SegmentedControl
                size="xs"
                aria-label="Choose library view"
                value={view}
                onChange={setView}
                color="accent"
                data={[
                  {
                    value: "grid",
                    label: (
                      <Group gap={5} wrap="nowrap">
                        <IconLayoutGrid size={15} />
                        <Text size="xs">Grid</Text>
                      </Group>
                    ),
                  },
                  {
                    value: "table",
                    label: (
                      <Group gap={5} wrap="nowrap">
                        <IconTable size={15} />
                        <Text size="xs">Table</Text>
                      </Group>
                    ),
                  },
                ]}
              />
            )}
            <Button
              size="xs"
              variant="light"
              leftSection={<IconDice5 size={16} />}
              onClick={openPicker}
            >
              Pick for me
            </Button>
            <FilterPresetsMenu
              presets={presets}
              onApply={updateAndApplyFilters}
              onSave={(name) => savePreset(name, filters)}
              onDelete={deletePreset}
            />
            <Box hiddenFrom="lg">
              <Button
                size="xs"
                leftSection={<IconFilter size={16} />}
                onClick={open}
              >
                Filters
              </Button>
            </Box>
          </Group>
        </Group>

        <MediaAppliedFilters
          filters={search}
          updateAndApplyFilters={updateAndApplyFilters}
        />

        <Flex gap="sm">
          <Box flex="1">
            {isInitialLoading ? (
              <SimpleGrid
                spacing={{ base: "sm", md: "md" }}
                cols={{
                  base: 1,
                  sm: 2,
                  lg: 3,
                  xl: 4,
                }}
              >
                {Array.from({ length: 8 }).map((_, index) => (
                  <MediaCardSkeleton key={index} />
                ))}
              </SimpleGrid>
            ) : !isFetching && data && records.length === 0 ? (
              <EmptyState
                icon={<IconMovie size={36} />}
                title={
                  hasAppliedFilters
                    ? "No media match these filters"
                    : "Your library is empty"
                }
                description={
                  hasAppliedFilters
                    ? "Clear the filters to see everything in your library."
                    : "Add your first movie, show, book, or game to get started."
                }
              >
                <Button
                  mt="xs"
                  variant="light"
                  leftSection={
                    hasAppliedFilters ? (
                      <IconFilter size={16} />
                    ) : (
                      <IconPlus size={16} />
                    )
                  }
                  onClick={() =>
                    hasAppliedFilters
                      ? resetFilters()
                      : navigate({ to: "/media/add" })
                  }
                >
                  {hasAppliedFilters ? "Clear filters" : "Add media"}
                </Button>
              </EmptyState>
            ) : view === "table" ? (
              <MediaTable data={records} />
            ) : (
              <SimpleGrid
                spacing={{ base: "sm", md: "md" }}
                cols={{
                  base: 1,
                  sm: 2,
                  lg: 3,
                  xl: 4,
                }}
              >
                <AnimatePresence mode="popLayout">
                  {records.map((record) => (
                    <motion.div
                      key={record.id}
                      {...gridItemMotionProps(reduceMotion)}
                    >
                      <MediaCard
                        media={record}
                        onView={(id) =>
                          navigate({
                            to: "/media/view/$id",
                            params: { id },
                            state: (previous) => ({
                              ...previous,
                              libraryReturnDepth: 1,
                            }),
                            viewTransition: true,
                          })
                        }
                        onEdit={(id) =>
                          navigate({
                            to: "/media/update/$id",
                            params: { id },
                            state: (previous) => ({
                              ...previous,
                              libraryReturnDepth: 1,
                            }),
                          })
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SimpleGrid>
            )}

            <Box ref={loadMoreRef} h={1} aria-hidden="true" />

            {(isFetchingNextPage || isFetchNextPageError) && (
              <Stack align="center" gap="xs" mt="md">
                {isFetchingNextPage && (
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="sm" c="dimmed">
                      Loading more entries...
                    </Text>
                  </Group>
                )}
                {isFetchNextPageError && (
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      Could not load more entries.
                    </Text>
                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => void fetchNextPage()}
                    >
                      Retry
                    </Button>
                  </Group>
                )}
              </Stack>
            )}
          </Box>

          <Box visibleFrom="lg" w={288} flex="0 0 288px">
            <MediaFilterCard
              filters={filters}
              applyFilters={applyFilters}
              resetFilters={resetFilters}
              updateFilters={updateFilters}
              dropdowns={dropdowns ?? { sources: [], tags: [] }}
              compact
            />
          </Box>
        </Flex>
      </Stack>

      <Drawer opened={opened} onClose={close}>
        <MediaFilterCard
          filters={filters}
          applyFilters={applyFilters}
          resetFilters={resetFilters}
          updateFilters={updateFilters}
          dropdowns={dropdowns ?? { sources: [], tags: [] }}
        />
      </Drawer>

      <MediaPickerModal
        opened={pickerOpened}
        onClose={closePicker}
        sources={dropdowns?.sources ?? []}
        tags={dropdowns?.tags ?? []}
        collections={collections ?? []}
        onView={(id) => {
          closePicker();
          navigate({
            to: "/media/view/$id",
            params: { id },
            state: (previous) => ({
              ...previous,
              libraryReturnDepth: 1,
            }),
          });
        }}
      />
    </Container>
  );
}
