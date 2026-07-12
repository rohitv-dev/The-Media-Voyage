import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import {
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBooks, IconPlus } from "@tabler/icons-react";
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
              <Card key={collection.id} withBorder shadow="sm" p="lg">
                <Stack gap="sm" h="100%">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Title order={4}>{collection.name}</Title>
                      <Text c="dimmed" size="sm">
                        {collection.description
                          ? String(collection.description)
                          : "No description provided."}
                      </Text>
                    </Stack>
                    <IconBooks size={18} />
                  </Group>

                  <Button
                    variant="light"
                    mt="auto"
                    onClick={() =>
                      navigate({
                        to: "/collection/edit/$id",
                        params: { id: collection.id },
                      })
                    }
                  >
                    Edit collection
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
