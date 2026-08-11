import {
  userMediaDropdownOptions,
  userMediaFilterInfiniteQueryOptions,
  userMediaSemanticSearchQueryOptions,
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
import {
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
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
import { MediaFilterCard } from "#/features/media/components/MediaFilters/MediaFilterCard";
import { MediaPickerModal } from "#/features/media/components/MediaPickerModal";
import { SemanticSearchPanel } from "#/features/media/components/SemanticSearchPanel";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import {
  IconDice5,
  IconFilter,
  IconLayoutGrid,
  IconMovie,
  IconPlus,
  IconSearch,
  IconTable,
} from "@tabler/icons-react";
import { MediaAppliedFilters } from "#/features/media/components/MediaFilters/MediaAppliedFilters";
import { MediaTable } from "#/features/media/components/MediaTable";
import { useFilterPresets } from "#/features/media/hooks/useFilterPresets";
import { FilterPresetsMenu } from "#/features/media/components/MediaFilters/FilterPresetsMenu";

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
  const semanticSearchFocusRequest = useLocation({
    select: (location) => location.state.semanticSearchFocusRequest,
  });
  const { data: dropdowns } = useQuery(userMediaDropdownOptions);
  const { data: collections } = useQuery(collectionQueryOptions);
  const [semanticQuery, setSemanticQuery] = useState("");
  const [semanticOpen, setSemanticOpen] = useState(false);
  const [semanticFocusRequest, setSemanticFocusRequest] = useState(0);
  const isExploring = semanticQuery.length > 0;
  const {
    data: semanticRecords,
    isPending: isSemanticPending,
    isFetching: isSemanticFetching,
    isError: isSemanticError,
    error: semanticError,
  } = useQuery(userMediaSemanticSearchQueryOptions(semanticQuery));
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
  } = useInfiniteQuery(
    userMediaFilterInfiniteQueryOptions(search, !isExploring),
  );
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
  const normalRecords = data?.pages.flatMap((page) => page.data) ?? [];
  const records = isExploring ? (semanticRecords ?? []) : normalRecords;
  const isResultsFetching = isExploring ? isSemanticFetching : isFetching;
  const isResultsPending = isExploring ? isSemanticPending : isPending;
  const hasLoadedResults = isExploring
    ? semanticRecords !== undefined
    : data !== undefined;

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
    if (isError || isSemanticError) {
      showErrorNotification({
        message: getApiErrorMessage(
          isSemanticError ? semanticError : error,
          isSemanticError ? "Explore search failed" : "Failed to load data",
        ),
        title: "Please try again later",
      });
    }
  }, [error, isError, isSemanticError, semanticError]);

  useEffect(() => {
    if (isMdDown && view !== "grid") {
      setView("grid");
    }
  }, [isMdDown, view, setView]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;

    if (
      isExploring ||
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
  }, [
    fetchNextPage,
    hasNextPage,
    isExploring,
    isFetchNextPageError,
    isFetchingNextPage,
  ]);

  useEffect(() => {
    if (skipNextSearchSyncRef.current) {
      skipNextSearchSyncRef.current = false;
      return;
    }
    setFilters(search);
  }, [search]);

  useEffect(() => {
    if (semanticSearchFocusRequest === undefined) return;

    setSemanticOpen(true);
    setSemanticFocusRequest((request) => request + 1);
    void navigate({
      to: "/media",
      search: (previous) => previous,
      replace: true,
      state: (previous) => ({
        ...previous,
        semanticSearchFocusRequest: undefined,
      }),
    });
  }, [navigate, semanticSearchFocusRequest]);

  const clearSemanticSearch = () => {
    setSemanticQuery("");
    setSemanticOpen(false);
  };

  const isInitialLoading = isResultsPending && !hasLoadedResults;

  return (
    <Container fluid pt="md" pb="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Group gap="xs">
              <Title order={2}>Library</Title>
              {isResultsFetching && !isFetchingNextPage && <Loader size="xs" />}
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
              disabled={isExploring}
            />
            <Button
              size="xs"
              variant={semanticOpen ? "filled" : "light"}
              leftSection={<IconSearch size={16} />}
              aria-pressed={semanticOpen}
              onClick={() => setSemanticOpen(true)}
            >
              Semantic search
            </Button>
            <Box hiddenFrom="lg">
              <Button
                size="xs"
                leftSection={<IconFilter size={16} />}
                onClick={open}
                disabled={isExploring}
              >
                Filters
              </Button>
            </Box>
          </Group>
        </Group>

        {semanticOpen && (
          <SemanticSearchPanel
            query={semanticQuery}
            isSearching={isSemanticFetching}
            onSearch={setSemanticQuery}
            onClear={clearSemanticSearch}
            focusRequest={semanticFocusRequest}
          />
        )}

        {!isExploring && (
          <MediaAppliedFilters
            filters={search}
            updateAndApplyFilters={updateAndApplyFilters}
          />
        )}

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
            ) : !isResultsFetching &&
              hasLoadedResults &&
              records.length === 0 ? (
              <EmptyState
                icon={<IconMovie size={36} />}
                title={
                  isExploring
                    ? "No semantic matches found"
                    : hasAppliedFilters
                      ? "No media match these filters"
                      : "Your library is empty"
                }
                description={
                  isExploring
                    ? "Try describing a different mood, theme, or story."
                    : hasAppliedFilters
                      ? "Clear the filters to see everything in your library."
                      : "Add your first movie, show, book, or game to get started."
                }
              >
                <Button
                  mt="xs"
                  variant="light"
                  leftSection={
                    isExploring || hasAppliedFilters ? (
                      <IconFilter size={16} />
                    ) : (
                      <IconPlus size={16} />
                    )
                  }
                  onClick={() =>
                    isExploring
                      ? clearSemanticSearch()
                      : hasAppliedFilters
                        ? resetFilters()
                        : navigate({ to: "/media/add" })
                  }
                >
                  {isExploring
                    ? "Clear explore search"
                    : hasAppliedFilters
                      ? "Clear filters"
                      : "Add media"}
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

            {!isExploring && <Box ref={loadMoreRef} h={1} aria-hidden="true" />}

            {!isExploring && (isFetchingNextPage || isFetchNextPageError) && (
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
            <fieldset
              disabled={isExploring}
              aria-label={
                isExploring
                  ? "Library filters are paused during semantic search"
                  : undefined
              }
              style={{
                border: 0,
                margin: 0,
                minWidth: 0,
                opacity: isExploring ? 0.5 : 1,
                padding: 0,
                transition: "opacity 150ms ease",
              }}
            >
              <MediaFilterCard
                filters={filters}
                applyFilters={applyFilters}
                resetFilters={resetFilters}
                updateFilters={updateFilters}
                dropdowns={dropdowns ?? { sources: [], tags: [] }}
                compact
              />
            </fieldset>
          </Box>
        </Flex>
      </Stack>

      <Drawer opened={opened} onClose={close}>
        <fieldset
          disabled={isExploring}
          aria-label={
            isExploring
              ? "Library filters are paused during semantic search"
              : undefined
          }
          style={{
            border: 0,
            margin: 0,
            minWidth: 0,
            opacity: isExploring ? 0.5 : 1,
            padding: 0,
            transition: "opacity 150ms ease",
          }}
        >
          <MediaFilterCard
            filters={filters}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            updateFilters={updateFilters}
            dropdowns={dropdowns ?? { sources: [], tags: [] }}
          />
        </fieldset>
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
