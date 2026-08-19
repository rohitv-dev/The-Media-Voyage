import { api, getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { EmptyState } from "#/components/EmptyState";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import { CollectionFindMedia } from "#/features/media-collection/components/CollectionFindMedia";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
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
  IconX,
} from "@tabler/icons-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  useEffect(() => {
    setOrderedItems(collectionItems);
  }, [collectionItems]);

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
          <CollectionFindMedia
            collectionId={collectionId}
            includedMediaIds={collectionItems.map((item) => item.userMediaId)}
          />
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
