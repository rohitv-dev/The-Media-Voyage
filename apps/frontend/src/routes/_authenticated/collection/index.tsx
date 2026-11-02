import { EmptyState } from "#/components/EmptyState";
import { MediaCardCoverArt } from "#/features/media/components/MediaCard/MediaCardCoverArt";
import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import { CollectionDetailsModal } from "#/features/media-collection/components/CollectionDetailsModal";
import {
  collectionQueryOptions,
  updateCollection,
} from "#/features/media-collection/queries";
import { getApiErrorMessage } from "#/lib/api";
import { showErrorNotification } from "#/lib/notifications";
import { queryKeys } from "#/lib/queryKeys";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBooks,
  IconPencil,
  IconPinned,
  IconPinnedFilled,
  IconPlus,
} from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { capitalizeWords } from "#/utils/strings";
import { useState } from "react";
import dayjs from "dayjs";

export const Route = createFileRoute("/_authenticated/collection/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(collectionQueryOptions);
  const [showCoverArt] = useCoverArtPreference();
  const [editingId, setEditingId] = useState<string | null>(null);
  const collectionToEdit = data.find(
    (collection) => collection.id === editingId,
  );
  const viewCollection = (id: string) =>
    navigate({ to: "/collection/view/$id", params: { id } });
  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      updateCollection(id, { pinned }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.collection.all }),
    onError: (error) =>
      showErrorNotification({
        title: "Could not update collection",
        message: getApiErrorMessage(error),
      }),
  });

  return (
    <Container size="xl" pt="md" pb="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={2}>Collections</Title>
            <Text c="dimmed" size="sm">
              Your media, your way.
            </Text>
          </Stack>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate({ to: "/collection/add" })}
          >
            New collection
          </Button>
        </Group>

        {data.length === 0 ? (
          <EmptyState
            icon={<IconBooks size={36} />}
            title="No collections yet"
            description="Create your first collection to group related media."
          />
        ) : (
          <SimpleGrid
            spacing={{ base: "sm", md: "md" }}
            cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
          >
            {data.map((collection) => {
              const previewImageUrls = showCoverArt
                ? collection.previewImageUrls
                : [];
              const pinLabel = `${collection.pinned ? "Unpin" : "Pin"} ${collection.name}`;

              return (
                <Card
                  key={collection.id}
                  className="media-card collection-card"
                  withBorder
                  p={{ base: "sm", sm: "md" }}
                  h="100%"
                  role="link"
                  aria-label={`View ${collection.name}`}
                  tabIndex={0}
                  onClick={() => viewCollection(collection.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      viewCollection(collection.id);
                    }
                  }}
                  style={{ cursor: "pointer", overflow: "hidden" }}
                >
                  <Stack justify="space-between" gap="sm" h="100%">
                    <Stack gap="sm">
                      {previewImageUrls.length > 0 && (
                        <Group
                          gap={0}
                          h={108}
                          w={168}
                          maw="100%"
                          wrap="nowrap"
                          aria-hidden="true"
                        >
                          {previewImageUrls.map((imageUrl, index) => (
                            <Box
                              key={`${imageUrl}-${index}`}
                              w="40%"
                              maw={64}
                              style={{
                                flexShrink: 0,
                                marginLeft: index === 0 ? 0 : "-8%",
                                transform: `rotate(${(index - (previewImageUrls.length - 1) / 2) * 6}deg)`,
                                zIndex: previewImageUrls.length - index,
                                overflow: "hidden",
                                borderRadius: "var(--mantine-radius-sm)",
                                boxShadow:
                                  "var(--neu-out-sm, var(--mantine-shadow-xs))",
                              }}
                            >
                              <MediaCardCoverArt
                                imageUrl={imageUrl}
                                coverArtSize="full"
                                imageFocusX={null}
                                imageFocusY={null}
                              />
                            </Box>
                          ))}
                        </Group>
                      )}
                      <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                      >
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                          <IconBooks
                            size={18}
                            style={{ flexShrink: 0 }}
                            aria-hidden="true"
                          />
                          <Title
                            order={5}
                            lineClamp={2}
                            fw={600}
                            style={{ overflowWrap: "anywhere" }}
                          >
                            {collection.name}
                          </Title>
                        </Group>

                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                          <Tooltip label={pinLabel} withArrow>
                            <ActionIcon
                              variant="subtle"
                              color={collection.pinned ? "accent" : "gray"}
                              size="sm"
                              aria-label={pinLabel}
                              loading={
                                pinMutation.isPending &&
                                pinMutation.variables.id === collection.id
                              }
                              disabled={pinMutation.isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                pinMutation.mutate({
                                  id: collection.id,
                                  pinned: !collection.pinned,
                                });
                              }}
                            >
                              {collection.pinned ? (
                                <IconPinnedFilled size={17} />
                              ) : (
                                <IconPinned size={17} />
                              )}
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Edit details" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="sm"
                              aria-label={`Edit details for ${collection.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditingId(collection.id);
                              }}
                            >
                              <IconPencil size={17} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      <Group gap={6} wrap="wrap">
                        <Badge size="sm" variant="light">
                          {collection.itemCount}{" "}
                          {collection.itemCount === 1 ? "item" : "items"}
                        </Badge>
                        <Badge
                          size="sm"
                          variant="light"
                          color={
                            collection.visibility === "public"
                              ? "green"
                              : collection.visibility === "friends"
                                ? "blue"
                                : "gray"
                          }
                        >
                          {capitalizeWords(collection.visibility)}
                        </Badge>
                      </Group>
                      {collection.description?.trim() && (
                        <Text c="dimmed" size="sm" lineClamp={1}>
                          {collection.description}
                        </Text>
                      )}
                    </Stack>

                    <Group
                      justify="space-between"
                      align="flex-end"
                      gap="xs"
                      wrap="nowrap"
                    >
                      <Text size="xs" c="dimmed" lh={1.4}>
                        Created{" "}
                        {dayjs(collection.createdAt).format("MMM DD, YYYY")}
                      </Text>
                      <Button
                        size="xs"
                        aria-label={
                          collection.itemCount > 0
                            ? `Edit items in ${collection.name}`
                            : undefined
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({
                            to: "/collection/edit/$id",
                            params: { id: collection.id },
                          });
                        }}
                      >
                        {collection.itemCount === 0
                          ? "Add items"
                          : "Edit items"}
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>
        )}
      </Stack>
      {collectionToEdit && (
        <CollectionDetailsModal
          key={collectionToEdit.id}
          collection={collectionToEdit}
          opened
          onClose={() => setEditingId(null)}
        />
      )}
    </Container>
  );
}
