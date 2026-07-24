import { api } from "#/lib/api";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type {
  MediaCollectionItemRecord,
  MediaRecord,
} from "@media-voyage/shared/api";
import { IconPlus, IconX, IconGripVertical } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import { confirmDelete } from "#/utils/confirmModal";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { capitalizeWords } from "#/utils/stringFunctions";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";

type CollectionItemsEditorProps = {
  data: MediaRecord[];
};

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const listItem: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 28,
    },
  },
};

export function CollectionItemsEditor(props: CollectionItemsEditorProps) {
  const { id: collectionId } = useParams({
    from: "/_authenticated/collection/edit/$id",
  });
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [orderedItems, setOrderedItems] = useState<MediaCollectionItemRecord[]>(
    [],
  );
  const [canSaveOrder, setCanSaveOrder] = useState(false);
  const queryClient = useQueryClient();

  const { data: collectionItems = [], isPending: isLoadingItems } = useQuery({
    queryKey: ["collection-items", collectionId],
    queryFn: () =>
      api<MediaCollectionItemRecord[]>(`/collectionItem/${collectionId}`),
  });

  useEffect(() => {
    setOrderedItems(collectionItems);
  }, [collectionItems]);

  const availableMediaOptions = useMemo(() => {
    const includedIds = new Set(
      collectionItems.map((item) => item.userMediaId),
    );

    return props.data
      .filter((entry) => !includedIds.has(entry.id))
      .map((entry) => ({
        value: entry.id,
        label: `${entry.title} (${capitalizeWords(entry.type)})`,
      }));
  }, [collectionItems, props.data]);

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
        queryKey: ["collection-items", collectionId],
      });
      setSelectedMediaId(null);
      showSuccessNotification({ message: "Added to collection" });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: error.message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) =>
      api(`/collectionItem/${collectionId}/${itemId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["collection-items", collectionId],
      });
      showSuccessNotification({ message: "Removed from collection" });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: error.message });
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
        queryKey: ["collection-items", collectionId],
      });
      setCanSaveOrder(false);
      showSuccessNotification({ message: "Order saved" });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: error.message });
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

    setCanSaveOrder((o) => !o);
  };

  return (
    <Container pt="sm">
      <Stack gap="lg">
        <motion.div
          initial={{
            opacity: 0,
            y: -15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
          }}
        >
          <Card withBorder shadow="sm" p="lg">
            <Stack gap="sm">
              <Title order={2}>Edit Collection Items</Title>
              <Text c="dimmed">
                Pick media from your library and add it to this collection.
              </Text>

              <Group align="end" grow>
                <Select
                  label="Add media"
                  placeholder={"Select an item to add"}
                  data={availableMediaOptions}
                  value={selectedMediaId}
                  onChange={setSelectedMediaId}
                  searchable
                  disabled={availableMediaOptions.length === 0}
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={handleAdd}
                  loading={addMutation.isPending}
                >
                  Add to collection
                </Button>
              </Group>

              {availableMediaOptions.length === 0 && (
                <Text size="sm" c="dimmed">
                  All of your media is already included in this collection.
                </Text>
              )}
            </Stack>
          </Card>
        </motion.div>

        <Stack gap="md">
          <motion.div
            initial={{
              opacity: 0,
              y: -15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <Group justify="space-between">
              <Title order={3}>Collection items</Title>
              <Group>
                <Button
                  variant="light"
                  size="sm"
                  disabled={!canSaveOrder}
                  onClick={() => saveOrderMutation.mutate(orderedItems)}
                  loading={saveOrderMutation.isPending}
                >
                  Save order
                </Button>
                <Badge color="teal" variant="light">
                  {orderedItems.length} items
                </Badge>
              </Group>
            </Group>
          </motion.div>

          {isLoadingItems ? (
            <Text c="dimmed">Loading collection items...</Text>
          ) : orderedItems.length === 0 ? (
            <Text c="dimmed">This collection does not have any items yet.</Text>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="collection-items">
                {(provided) => (
                  <Box ref={provided.innerRef} {...provided.droppableProps}>
                    <motion.div
                      variants={container}
                      initial="hidden"
                      animate="show"
                    >
                      <Stack gap="sm">
                        {orderedItems.map((item, index) => (
                          <motion.div key={item.id} variants={listItem}>
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={index}
                            >
                              {(innerProvided, snapshot) => (
                                <Card
                                  p="xs"
                                  ref={innerProvided.innerRef}
                                  {...innerProvided.draggableProps}
                                  {...innerProvided.dragHandleProps}
                                  withBorder
                                  padding="md"
                                  style={{
                                    ...innerProvided.draggableProps.style,
                                    cursor: snapshot.isDragging
                                      ? "grabbing"
                                      : "grab",
                                    transformOrigin: "center",
                                    boxShadow: snapshot.isDragging
                                      ? "var(--mantine-shadow-xl)"
                                      : undefined,
                                    opacity: snapshot.isDragging ? 0.95 : 1,
                                  }}
                                >
                                  <Group justify="space-between" align="center">
                                    <Group gap="md">
                                      <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        style={{ cursor: "inherit" }}
                                      >
                                        <IconGripVertical size={18} />
                                      </ActionIcon>

                                      <Stack gap={2}>
                                        <Text fw={600}>{item.title}</Text>
                                        <Text size="xs" c="dimmed">
                                          {capitalizeWords(item.type)}
                                        </Text>
                                      </Stack>
                                    </Group>

                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      aria-label={`Remove ${item.title} from collection`}
                                      loading={removeMutation.isPending}
                                      onClick={() => handleRemove(item)}
                                    >
                                      <IconX size={16} />
                                    </ActionIcon>
                                  </Group>
                                </Card>
                              )}
                            </Draggable>
                          </motion.div>
                        ))}
                      </Stack>
                    </motion.div>

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
