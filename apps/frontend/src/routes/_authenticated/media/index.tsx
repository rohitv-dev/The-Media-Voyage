import {
  userMediaDropdownOptions,
  userMediaFilterInfiniteQueryOptions,
  userMediaHybridSearchQueryOptions,
} from "#/features/media/queries";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Container,
  Drawer,
  Flex,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { MediaCard } from "#/features/media/components/MediaCard";
import { MediaCardSkeleton } from "#/features/media/components/MediaCardSkeleton";
import {
  MobileMediaCard,
  MobileMediaCardSkeleton,
} from "#/features/media/components/MobileMediaCard";
import { EmptyState } from "#/components/EmptyState";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { getApiErrorMessage } from "#/lib/api";
import { showErrorNotification } from "#/lib/notifications";
import {
  useDebouncedCallback,
  useDisclosure,
  useMediaQuery,
} from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { PHONE_WIDTH_QUERY } from "#/theme/breakpoints";
import { gridItemMotionProps } from "#/theme/motion";
import { MediaFilterCard } from "#/features/media/components/MediaFilters/MediaFilterCard";
import { MediaPickerModal } from "#/features/media/components/MediaPickerModal";
import { LibrarySearchPanel } from "#/features/media/components/LibrarySearchPanel";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import {
  IconDice5,
  IconFilter,
  IconInfoCircle,
  IconMovie,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { MediaAppliedFilters } from "#/features/media/components/MediaFilters/MediaAppliedFilters";
import { useTutorial } from "#/features/tutorials/useTutorial";
import { TutorialTrigger } from "#/features/tutorials/components/TutorialTrigger";

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
  const libraryTutorial = useTutorial("library");
  const librarySearchOpenRequest = useLocation({
    select: (location) => location.state.librarySearchFocusRequest,
  });
  const librarySearchQuery = useLocation({
    select: (location) => location.state.librarySearchQuery ?? "",
  });
  const { data: dropdowns } = useQuery(userMediaDropdownOptions);
  const { data: collections } = useQuery(collectionQueryOptions);
  const [searchPanelOpened, setSearchPanelOpened] = useState(false);
  const [librarySearchFocusRequest, setLibrarySearchFocusRequest] = useState(0);
  const isExploring = librarySearchQuery.length > 0;
  const librarySearchOpen = searchPanelOpened || isExploring;
  const {
    data: librarySearchRecords,
    isPending: isLibrarySearchPending,
    isFetching: isLibrarySearchFetching,
    isError: isLibrarySearchError,
    error: librarySearchError,
  } = useQuery(userMediaHybridSearchQueryOptions(librarySearchQuery));
  const {
    data,
    isFetching,
    isPending,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery(
    userMediaFilterInfiniteQueryOptions(search, !isExploring),
  );
  const navigate = useNavigate();
  const reduceMotion = useAppReducedMotion();
  const isMobile = useMediaQuery(PHONE_WIDTH_QUERY, undefined, {
    getInitialValueInEffect: false,
  });
  const [opened, { open, close }] = useDisclosure();
  const [pickerOpened, { open: openPicker, close: closePicker }] =
    useDisclosure();

  const [filters, setFilters] = useState<UserMediaQuerySchema>(search);
  const skipNextSearchSyncRef = useRef(false);
  const applyTitleSearch = useDebouncedCallback((value: string) => {
    const title = value.trim() || undefined;
    if (title === search.search) return;

    skipNextSearchSyncRef.current = true;
    void navigate({
      to: "/media",
      search: (previous) => ({ ...previous, search: title }),
      state: true,
      replace: true,
      resetScroll: false,
    });
  }, 300);
  const changeTitleSearch = (value: string) => {
    setFilters((previous) => ({ ...previous, search: value || undefined }));
    applyTitleSearch(value);
  };
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const normalRecords = data?.pages.flatMap((page) => page.data) ?? [];
  const records = isExploring ? (librarySearchRecords ?? []) : normalRecords;
  const isResultsFetching = isExploring ? isLibrarySearchFetching : isFetching;
  const isResultsPending = isExploring ? isLibrarySearchPending : isPending;
  const hasLoadedResults = isExploring
    ? librarySearchRecords !== undefined
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
    applyTitleSearch.cancel();
    skipNextSearchSyncRef.current = true;
    navigate({
      to: "/media",
      search: isMobile
        ? { ...filters, search: filters.search?.trim() || undefined }
        : filters,
    });
    close();
  };

  const updateAndApplyFilters = (newFilters: UserMediaQuerySchema) => {
    const nextFilters =
      applyTitleSearch.isPending() && newFilters.search === search.search
        ? { ...newFilters, search: filters.search?.trim() || undefined }
        : newFilters;
    applyTitleSearch.cancel();
    updateFilters(nextFilters);
    skipNextSearchSyncRef.current = true;
    navigate({ to: "/media", search: nextFilters });
    close();
  };

  const resetFilters = () => {
    applyTitleSearch.cancel();
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
    if (isError || isLibrarySearchError) {
      showErrorNotification({
        message: getApiErrorMessage(
          isLibrarySearchError ? librarySearchError : error,
          isLibrarySearchError
            ? "Library search failed"
            : "Failed to load data",
        ),
        title: "Please try again later",
      });
    }
  }, [error, isError, isLibrarySearchError, librarySearchError]);

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
    applyTitleSearch.cancel();
    setFilters(search);
  }, [applyTitleSearch, search]);

  const openLibrarySearch = useCallback(() => {
    applyTitleSearch.flush();
    setSearchPanelOpened(true);
    setLibrarySearchFocusRequest((request) => request + 1);
  }, [applyTitleSearch]);

  useEffect(() => {
    if (librarySearchOpenRequest === undefined) return;

    openLibrarySearch();
    void navigate({
      to: "/media",
      search: (previous) => previous,
      replace: true,
      state: (previous) => ({
        ...previous,
        librarySearchFocusRequest: undefined,
      }),
    });
  }, [librarySearchOpenRequest, navigate, openLibrarySearch]);

  const submitLibrarySearch = (query: string) => {
    void navigate({
      to: "/media",
      search: true,
      replace: true,
      resetScroll: false,
      state: (previous) => ({
        ...previous,
        librarySearchQuery: query || undefined,
      }),
    });
  };

  const clearLibrarySearch = () => {
    if (isExploring) submitLibrarySearch("");
    setSearchPanelOpened(false);
  };

  const viewMedia = (id: string) =>
    navigate({
      to: "/media/view/$id",
      params: { id },
      state: (previous) => ({
        ...previous,
        libraryReturnDepth: 1,
      }),
      viewTransition: true,
    });

  const editMedia = (id: string) =>
    navigate({
      to: "/media/update/$id",
      params: { id },
      state: (previous) => ({
        ...previous,
        libraryReturnDepth: 1,
      }),
    });

  const isInitialLoading = isResultsPending && !hasLoadedResults;
  const filterButton = (
    <Button
      size="xs"
      leftSection={<IconFilter size={16} />}
      onClick={open}
      disabled={isExploring}
    >
      Filters
    </Button>
  );
  const pickForMe = (
    <Box
      flex={{ base: "1 1 auto", sm: "0 0 auto" }}
      data-tutorial="library-pick-for-me"
    >
      <Button
        size="xs"
        variant="light"
        leftSection={<IconDice5 size={16} />}
        onClick={openPicker}
        w={{ base: "100%", sm: "auto" }}
      >
        Pick for me
      </Button>
    </Box>
  );

  return (
    <Container fluid px={{ base: "sm", sm: "md" }} pt="md" pb="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Stack gap={2}>
            <Group gap="xs">
              <Title order={2}>Library</Title>
              <TutorialTrigger
                label="Start Library tutorial"
                onClick={libraryTutorial.start}
              />
              {isResultsFetching && !isFetchingNextPage && <Loader size="xs" />}
            </Group>
            <Text c="dimmed" size="sm">
              Select an entry to view the full details, or use the action button
              to update.
            </Text>
          </Stack>

          <Group
            gap="xs"
            w={{ base: "100%", sm: "auto" }}
            data-tutorial="library-core-controls"
          >
            {isMobile && (
              <Group w="100%" gap="xs" wrap="nowrap">
                <TextInput
                  aria-label="Search titles"
                  placeholder="Search titles"
                  data-shortcut="library-search"
                  value={filters.search ?? ""}
                  disabled={isExploring}
                  size="xs"
                  flex={1}
                  miw={0}
                  inputMode="search"
                  enterKeyHint="search"
                  styles={{
                    input: { fontSize: "var(--mantine-font-size-md)" },
                  }}
                  leftSection={<IconSearch size={16} />}
                  rightSectionPointerEvents="auto"
                  rightSection={
                    filters.search && (
                      <ActionIcon
                        type="button"
                        size="sm"
                        variant="subtle"
                        color="gray"
                        aria-label="Clear title search"
                        disabled={isExploring}
                        onClick={() => {
                          changeTitleSearch("");
                          applyTitleSearch.flush();
                        }}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    )
                  }
                  onChange={(event) =>
                    changeTitleSearch(event.currentTarget.value)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      applyTitleSearch.flush();
                      event.currentTarget.blur();
                    }
                  }}
                />
                {filterButton}
              </Group>
            )}
            {!isMobile && pickForMe}
            <Box
              flex={{ base: "1 1 auto", sm: "0 0 auto" }}
              data-tutorial="library-describe"
            >
              <Button
                size="xs"
                variant={librarySearchOpen ? "filled" : "light"}
                leftSection={<IconSearch size={16} />}
                aria-pressed={librarySearchOpen}
                onClick={openLibrarySearch}
                w={{ base: "100%", sm: "auto" }}
              >
                Describe what you want
              </Button>
            </Box>
            {isMobile ? pickForMe : <Box hiddenFrom="lg">{filterButton}</Box>}
          </Group>
        </Group>

        {librarySearchOpen && (
          <LibrarySearchPanel
            query={librarySearchQuery}
            isSearching={isLibrarySearchFetching}
            onSearch={submitLibrarySearch}
            onClear={clearLibrarySearch}
            focusRequest={librarySearchFocusRequest}
          />
        )}

        {isExploring && (
          <Alert
            color="accent"
            variant="light"
            icon={<IconInfoCircle size={16} />}
            py="xs"
          >
            Exploring your library — filters are paused.
          </Alert>
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
                  <Box key={index}>
                    {isMobile ? (
                      <MobileMediaCardSkeleton />
                    ) : (
                      <MediaCardSkeleton />
                    )}
                  </Box>
                ))}
              </SimpleGrid>
            ) : !isExploring && isError && !hasLoadedResults ? (
              <EmptyState
                title="Library could not be loaded"
                description="Check your connection and try loading it again."
              >
                <Button
                  variant="light"
                  loading={isFetching}
                  onClick={() => void refetch()}
                >
                  Try again
                </Button>
              </EmptyState>
            ) : !isResultsFetching &&
              hasLoadedResults &&
              records.length === 0 ? (
              <EmptyState
                icon={<IconMovie size={36} />}
                title={
                  isExploring
                    ? "No matches found"
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
                      ? clearLibrarySearch()
                      : hasAppliedFilters
                        ? resetFilters()
                        : navigate({ to: "/media/add" })
                  }
                >
                  {isExploring
                    ? "Clear search"
                    : hasAppliedFilters
                      ? "Clear filters"
                      : "Add media"}
                </Button>
              </EmptyState>
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
                      {isMobile ? (
                        <MobileMediaCard
                          media={record}
                          onView={viewMedia}
                          onEdit={editMedia}
                        />
                      ) : (
                        <MediaCard
                          media={record}
                          onView={viewMedia}
                          onEdit={editMedia}
                        />
                      )}
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
            <MediaFilterCard
              filters={filters}
              applyFilters={applyFilters}
              resetFilters={resetFilters}
              updateFilters={updateFilters}
              dropdowns={dropdowns ?? { sources: [], tags: [] }}
              compact
              disabled={isExploring}
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
          showTitleSearch={!isMobile}
          disabled={isExploring}
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
