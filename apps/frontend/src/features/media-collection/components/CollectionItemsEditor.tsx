import { api, getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { userMediaSearchQueryOptions } from "#/features/media/queries";
import { EmptyState } from "#/components/EmptyState";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import type { MediaCollectionItemRecord } from "@media-voyage/shared/api";
import {
  IconArrowLeft,
  IconBooks,
  IconCheck,
  IconGripVertical,
  IconList,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { confirmDelete } from "#/lib/confirmModal";
import { motion } from "motion/react";
import { capitalizeWords } from "#/utils/strings";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { fadeUpEntranceProps } from "#/theme/motion";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";

export function CollectionItemsEditor() {
  const { id: collectionId } = useParams({
    from: "/_authenticated/collection/edit/$id",
  });
  const navigate = useNavigate();
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const selectedMediaLabelRef = useRef<string | null>(null);
  const [mediaSearch, setMediaSearch] = useState("");
  const [debouncedMediaSearch] = useDebouncedValue(mediaSearch, 300);
  const [orderedItems, setOrderedItems] = useState<MediaCollectionItemRecord[]>(
    [],
  );
  const [canSaveOrder, setCanSaveOrder] = useState(false);
  const queryClient = useQueryClient();
  const reduceMotion = useAppReducedMotion();
  const { data: collections } = useSuspenseQuery(collectionQueryOptions);
  const collection = collections.find((entry) => entry.id === collectionId);

  const { data: collectionItems = [], isPending: isLoadingItems } = useQuery({
    queryKey: queryKeys.collection.items(collectionId),
    queryFn: () =>
      api<MediaCollectionItemRecord[]>(`/collectionItem/${collectionId}`),
    enabled: Boolean(collection),
  });
  const {
    data: searchResults = [],
    isFetching: isSearchingMedia,
    isError: isMediaSearchError,
  } = useQuery(userMediaSearchQueryOptions(debouncedMediaSearch));

  useEffect(() => {
    setOrderedItems(collectionItems);
  }, [collectionItems]);

  const availableMediaOptions = useMemo(() => {
    const includedIds = new Set(
      collectionItems.map((item) => item.userMediaId),
    );

    return searchResults
      .filter((entry) => !includedIds.has(entry.id))
      .map((entry) => ({
        value: entry.id,
        label: `${entry.title} (${capitalizeWords(entry.type)})`,
      }));
  }, [collectionItems, searchResults]);

  const handleMediaChange = (value: string | null) => {
    selectedMediaLabelRef.current =
      value === null
        ? null
        : (availableMediaOptions.find((option) => option.value === value)
            ?.label ?? null);
    setSelectedMediaId(value);
  };

  const handleMediaSearchChange = (value: string) => {
    setMediaSearch(value);
    if (value !== selectedMediaLabelRef.current) {
      selectedMediaLabelRef.current = null;
      setSelectedMediaId(null);
    }
  };

  const trimmedMediaSearch = mediaSearch.trim();
  const isMediaSearchSettled =
    debouncedMediaSearch.trim() === trimmedMediaSearch;
  const isMediaSearchLoading =
    trimmedMediaSearch.length >= 2 &&
    (!isMediaSearchSettled || isSearchingMedia);
  let searchEmptyMessage: string | undefined;

  switch (true) {
    case trimmedMediaSearch.length < 2:
      searchEmptyMessage = "Type at least 2 characters to search";
      break;
    case isMediaSearchLoading:
      searchEmptyMessage = "Searching your library...";
      break;
    case isMediaSearchError:
      searchEmptyMessage = "Search failed";
      break;
    case searchResults.length === 0:
      searchEmptyMessage = "No matches found";
      break;
    case availableMediaOptions.length === 0:
      searchEmptyMessage = "All matching media is already included";
      break;
  }

  const addMutation = useMutation({
    mutationFn: async (userMediaId: string) =>
      api(`/collectionItem/${collectionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userMediaId }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.items(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.itemsDetailed(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      selectedMediaLabelRef.current = null;
      setSelectedMediaId(null);
      showSuccessNotification({ message: "Added to collection" });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: getApiErrorMessage(error) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) =>
      api(`/collectionItem/${collectionId}/${itemId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.items(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.itemsDetailed(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      showSuccessNotification({ message: "Removed from collection" });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: getApiErrorMessage(error) });
    },
  });

  const saveOrderMutation = useMutation({
    mutationFn: async (items: MediaCollectionItemRecord[]) =>
      api(`/collectionItem/${collectionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((item, index) => ({
            id: item.id,
            position: index + 1,
          })),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.items(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.itemsDetailed(collectionId),
      });
      setCanSaveOrder(false);
      showSuccessNotification({ message: "Order saved" });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: getApiErrorMessage(error) });
    },
  });

  const handleAdd = () => {
    if (!selectedMediaId) return;
    addMutation.mutate(selectedMediaId);
  };

  const handleRemove = (item: MediaCollectionItemRecord) => {
    confirmDelete({
      title: "Remove item",
      message: `Remove "${item.title}" from this collection?`,
      confirmLabel: "Remove",
      onConfirm: () => removeMutation.mutate(item.id),
    });
  };

  const reorder = (
    list: MediaCollectionItemRecord[],
    startIndex: number,
    endIndex: number,
  ) => {
    const result = [...list];
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    if (result.destination.index === result.source.index) return;

    setOrderedItems((items) =>
      reorder(items, result.source.index, result.destination!.index),
    );

    setCanSaveOrder(true);
  };

  if (!collection) {
    return (
      <Container size="lg" py="md">
        <EmptyState
          icon={<IconBooks size={36} />}
          title="Collection not found"
          description="This collection may have been removed or is no longer available."
          radius="lg"
        >
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate({ to: "/collection" })}
          >
            Back to collections
          </Button>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <motion.div {...fadeUpEntranceProps(reduceMotion, -15)}>
          <Stack gap="xs">
            <Button
              variant="subtle"
              color="gray"
              px={0}
              w="fit-content"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() =>
                navigate({
                  to: "/collection/view/$id",
                  params: { id: collectionId },
                })
              }
            >
              Back to collection
            </Button>
            <Title order={2}>Edit items in {collection.name}</Title>
            <Text c="dimmed">
              Add media from your library, then drag items into the order you
              want.
            </Text>
          </Stack>
        </motion.div>

        <motion.div {...fadeUpEntranceProps(reduceMotion, -15)}>
          <Card withBorder radius="lg" p="lg">
            <Stack gap="md">
              <Flex
                direction={{ base: "column", sm: "row" }}
                align={{ base: "stretch", sm: "flex-end" }}
                gap="sm"
              >
                <Select
                  label="Add media"
                  placeholder="Type to search your library"
                  data={availableMediaOptions}
                  value={selectedMediaId}
                  onChange={handleMediaChange}
                  searchable
                  searchValue={mediaSearch}
                  onSearchChange={handleMediaSearchChange}
                  nothingFoundMessage={searchEmptyMessage}
                  style={{ flex: 1 }}
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAdd}
                  loading={addMutation.isPending}
                  disabled={!selectedMediaId}
                >
                  Add to collection
                </Button>
              </Flex>
            </Stack>
          </Card>
        </motion.div>

        <Stack gap="md">
          <motion.div {...fadeUpEntranceProps(reduceMotion, -15)}>
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <Title order={3}>Collection items</Title>
                <Badge color="gray" variant="light">
                  {orderedItems.length}{" "}
                  {orderedItems.length === 1 ? "item" : "items"}
                </Badge>
              </Group>
              {canSaveOrder ? (
                <Button
                  size="sm"
                  onClick={() => saveOrderMutation.mutate(orderedItems)}
                  loading={saveOrderMutation.isPending}
                >
                  Save order
                </Button>
              ) : (
                <Group gap={6} c="dimmed">
                  <IconCheck size={16} />
                  <Text size="sm">Order saved</Text>
                </Group>
              )}
            </Group>
          </motion.div>

          {isLoadingItems ? (
            <Text c="dimmed">Loading collection items...</Text>
          ) : orderedItems.length === 0 ? (
            <EmptyState
              icon={<IconList size={32} />}
              title="No items yet"
              description="Search your library above to add the first item to this collection."
              radius="lg"
            />
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="collection-items">
                {(provided) => (
                  <Box ref={provided.innerRef} {...provided.droppableProps}>
                    <Stack gap="sm">
                      {orderedItems.map((item, index) => (
                        <Draggable
                          key={item.id}
                          draggableId={item.id}
                          index={index}
                        >
                          {(innerProvided, snapshot) => (
                            <Card
                              ref={innerProvided.innerRef}
                              {...innerProvided.draggableProps}
                              withBorder
                              padding="md"
                              radius="md"
                              style={{
                                ...innerProvided.draggableProps.style,
                                transition: snapshot.isDropAnimating
                                  ? reduceMotion
                                    ? "none"
                                    : "transform 160ms cubic-bezier(0.2, 0, 0, 1)"
                                  : innerProvided.draggableProps.style
                                      ?.transition,
                                transformOrigin: "center",
                                boxShadow: snapshot.isDragging
                                  ? "var(--mantine-shadow-xl)"
                                  : undefined,
                                opacity: snapshot.isDragging ? 0.95 : 1,
                              }}
                            >
                              <Group
                                justify="space-between"
                                align="center"
                                wrap="nowrap"
                              >
                                <Group gap="sm" wrap="nowrap" miw={0}>
                                  <Tooltip label="Drag to reorder" withArrow>
                                    <ActionIcon
                                      {...innerProvided.dragHandleProps}
                                      variant="subtle"
                                      color="gray"
                                      aria-label={`Drag ${item.title} to reorder`}
                                      style={{
                                        cursor: snapshot.isDragging
                                          ? "grabbing"
                                          : "grab",
                                      }}
                                    >
                                      <IconGripVertical size={18} />
                                    </ActionIcon>
                                  </Tooltip>

                                  <Text
                                    size="xs"
                                    fw={700}
                                    c="dimmed"
                                    ff="monospace"
                                    w={22}
                                  >
                                    {String(index + 1).padStart(2, "0")}
                                  </Text>

                                  <Stack gap={2} miw={0}>
                                    <Text fw={600} truncate>
                                      {item.title}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {capitalizeWords(item.type)}
                                    </Text>
                                  </Stack>
                                </Group>

                                <Tooltip
                                  label="Remove from collection"
                                  withArrow
                                >
                                  <ActionIcon
                                    color="red"
                                    variant="subtle"
                                    aria-label={`Remove ${item.title} from collection`}
                                    loading={
                                      removeMutation.isPending &&
                                      removeMutation.variables === item.id
                                    }
                                    disabled={
                                      removeMutation.isPending &&
                                      removeMutation.variables !== item.id
                                    }
                                    onClick={() => handleRemove(item)}
                                  >
                                    <IconX size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    </Stack>

                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
