import {
  userMediaDropdownOptions,
  userMediaFilterQueryOptions,
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
} from "@mantine/core";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MediaCard } from "#/features/media/components/MediaCard";
import { MediaCardSkeleton } from "#/features/media/components/MediaCardSkeleton";
import { EmptyState } from "#/components/EmptyState";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { showErrorNotification } from "#/utils/notifications";
import { useDisclosure, useLocalStorage, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";
import { MediaFilterCard } from "#/features/media/components/MediaFilterCard";
import { MediaPickerModal } from "#/features/media/components/MediaPickerModal";
import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import {
  IconDice5,
  IconFilter,
  IconLayoutGrid,
  IconMovie,
  IconPlus,
  IconTable,
} from "@tabler/icons-react";
import { MediaAppliedFilters } from "#/features/media/components/MediaAppliedFilters";
import { MediaTable } from "#/features/media/components/MediaTable";
import { useFilterPresets } from "#/features/media/hooks/useFilterPresets";
import { FilterPresetsMenu } from "#/features/media/components/FilterPresetsMenu";

type ViewType = "grid" | "table";

export const Route = createFileRoute("/_authenticated/media/")({
  validateSearch: userMediaQuerySchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context: { queryClient }, deps }) => {
    queryClient.ensureQueryData(userMediaDropdownOptions);
    queryClient.ensureQueryData(collectionQueryOptions);
    queryClient.ensureQueryData(userMediaFilterQueryOptions(deps));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const { data: dropdowns } = useQuery(userMediaDropdownOptions);
  const { data: collections } = useQuery(collectionQueryOptions);
  const { data, isFetching, isError } = useQuery({
    ...userMediaFilterQueryOptions(search),
    placeholderData: keepPreviousData,
  });
  const navigate = useNavigate();
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
    navigate({ to: "/media", search: filters });
    close();
  };

  const updateAndApplyFilters = (newFilters: UserMediaQuerySchema) => {
    updateFilters(newFilters);
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
    close();
    navigate({ to: "/media", search: undefined });
  };

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

  useEffect(() => {
    setFilters(search);
  }, [search]);

  return (
    <Container fluid pt="md" pb="md">
      <Stack gap="xs">
        <Group justify="apart" align="center" mb="md">
          <Stack gap={2}>
            <Group justify="space-between" align="center">
              <Group>
                <Text size="lg" fw={700}>
                  Library
                </Text>
                {isFetching && <Loader size="xs" />}
              </Group>
              <Group gap="xs">
                {!isMdDown && <SegmentedControl
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
                />}
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
            <Text color="dimmed" size="sm">
              Select an entry to view the full details, or use the action button
              to update.
            </Text>

            <MediaAppliedFilters
              filters={search}
              updateAndApplyFilters={updateAndApplyFilters}
            />
          </Stack>
        </Group>

        <Flex gap="sm">
          <Box flex="1">
            {isFetching && !data ? (
              <SimpleGrid
                spacing={{ base: "xs", md: "md" }}
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
            ) : !isFetching && data?.data.length === 0 ? (
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
              <MediaTable data={data?.data ?? []} />
            ) : (
              <SimpleGrid
                hidden={view !== "grid"}
                spacing={{ base: "xs", md: "md" }}
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
                        media={record}
                        onView={(id) =>
                          navigate({
                            to: "/media/view/$id",
                            params: { id },
                            viewTransition: true,
                          })
                        }
                        onEdit={(id) =>
                          navigate({
                            to: "/media/update/$id",
                            params: { id },
                          })
                        }
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SimpleGrid>
            )}
          </Box>

          <Box visibleFrom="lg" w={248} flex="0 0 248px">
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
          navigate({ to: "/media/view/$id", params: { id } });
        }}
      />
    </Container>
  );
}
