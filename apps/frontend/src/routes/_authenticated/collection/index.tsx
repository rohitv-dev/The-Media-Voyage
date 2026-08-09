import { EmptyState } from "#/components/EmptyState";
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
  Divider,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBooks,
  IconList,
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
              Manage your custom media collections and the items inside them.
            </Text>
          </Stack>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => navigate({ to: "/collection/add" })}
          >
            New Collection
          </Button>
        </Group>

        {data.length === 0 ? (
          <EmptyState
            icon={<IconBooks size={36} />}
            title="No collections yet"
            description="Create your first collection to group related media."
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {data.map((collection) => (
              <Card
                key={collection.id}
                withBorder
                shadow="xs"
                radius="lg"
                p={0}
                h="100%"
                role="link"
                tabIndex={0}
                onClick={() =>
                  navigate({
                    to: "/collection/view/$id",
                    params: { id: collection.id },
                  })
                }
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate({
                      to: "/collection/view/$id",
                      params: { id: collection.id },
                    });
                  }
                }}
                style={{ cursor: "pointer", overflow: "hidden" }}
              >
                <Stack gap={0} h="100%">
                  <Box
                    px="lg"
                    pt="lg"
                    pb="md"
                    style={{
                      background: "var(--mantine-color-default-hover)",
                      borderBottom:
                        "1px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Group justify="space-between" align="center" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <ThemeIcon
                          variant="light"
                          color="accent"
                          radius="md"
                          size="lg"
                        >
                          <IconBooks size={19} />
                        </ThemeIcon>
                        <Badge variant="light" color="gray" size="sm">
                          {collection.itemCount}{" "}
                          {collection.itemCount === 1 ? "item" : "items"}
                        </Badge>
                      </Group>

                      <Tooltip
                        label={
                          collection.pinned
                            ? "Unpin collection"
                            : "Pin collection"
                        }
                        withArrow
                      >
                        <ActionIcon
                          variant={collection.pinned ? "light" : "subtle"}
                          color={collection.pinned ? "accent" : "gray"}
                          radius="xl"
                          aria-label={
                            collection.pinned
                              ? `Unpin ${collection.name}`
                              : `Pin ${collection.name}`
                          }
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
                    </Group>

                    <Title order={3} mt="md" lineClamp={2}>
                      {collection.name}
                    </Title>
                    <Badge
                      mt={6}
                      variant="light"
                      color={
                        collection.visibility === "public"
                          ? "green"
                          : collection.visibility === "friends"
                            ? "blue"
                            : "gray"
                      }
                      size="sm"
                    >
                      {capitalizeWords(collection.visibility)}
                    </Badge>
                  </Box>

                  <Stack gap="md" p="lg" style={{ flex: 1 }}>
                    <Text
                      c="dimmed"
                      size="sm"
                      lineClamp={2}
                      style={{ flex: 1 }}
                    >
                      {collection.description
                        ? String(collection.description)
                        : "No description provided."}
                    </Text>

                    <Divider />

                    <Group justify="space-between" gap="xs" wrap="nowrap">
                      <Button
                        variant="subtle"
                        color="gray"
                        size="sm"
                        leftSection={<IconList size={16} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({
                            to: "/collection/edit/$id",
                            params: { id: collection.id },
                          });
                        }}
                      >
                        Edit items
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        rightSection={<IconArrowRight size={16} />}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({
                            to: "/collection/view/$id",
                            params: { id: collection.id },
                          });
                        }}
                      >
                        View
                      </Button>
                    </Group>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
