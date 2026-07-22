import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import {
  ActionIcon,
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
import { IconBooks, IconEdit, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/collection/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(collectionQueryOptions);

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
          <Card withBorder p="xl">
            <Stack align="center" gap="xs">
              <IconBooks size={36} />
              <Text fw={600}>No collections yet</Text>
              <Text c="dimmed" size="sm" ta="center">
                Create your first collection to group related media.
              </Text>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {data.map((collection) => (
              <Card
                key={collection.id}
                withBorder
                shadow="sm"
                p="lg"
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
                style={{ cursor: "pointer" }}
              >
                <Stack gap="sm" h="100%">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Title order={4} lineClamp={2}>
                        {collection.name}
                      </Title>
                      <Text c="dimmed" size="sm">
                        {collection.description
                          ? String(collection.description)
                          : "No description provided."}
                      </Text>
                    </Stack>
                    <Group gap={6} wrap="nowrap">
                      <IconBooks size={18} />
                      <Tooltip label="Edit collection" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          aria-label={`Edit ${collection.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate({
                              to: "/collection/edit/$id",
                              params: { id: collection.id },
                            });
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>

                  <Button
                    variant="light"
                    mt="auto"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate({
                        to: "/collection/view/$id",
                        params: { id: collection.id },
                      });
                    }}
                  >
                    View collection
                  </Button>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
