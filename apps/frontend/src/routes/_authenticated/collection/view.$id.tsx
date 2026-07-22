import { MediaCard } from "#/features/media/components/MediaCard";
import {
  collectionItemsDetailedQueryOptions,
  collectionQueryOptions,
} from "#/features/mediaCollection/queries";
import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconBooks, IconEdit } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

export const Route = createFileRoute("/_authenticated/collection/view/$id")({
  loader: ({ context: { queryClient }, params: { id } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
    queryClient.ensureQueryData(collectionItemsDetailedQueryOptions(id));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: collections } = useSuspenseQuery(collectionQueryOptions);
  const { data: items } = useSuspenseQuery(
    collectionItemsDetailedQueryOptions(id),
  );
  const collection = collections.find((entry) => entry.id === id);

  const goToEdit = () =>
    navigate({ to: "/collection/edit/$id", params: { id } });

  if (!collection) {
    return (
      <Container size="xl" pt="md" pb="md">
        <Card withBorder p="xl">
          <Stack align="center" gap="xs">
            <IconBooks size={36} />
            <Text fw={600}>Collection not found</Text>
            <Text c="dimmed" size="sm" ta="center">
              This collection doesn't exist or is no longer available to you.
            </Text>
            <Button
              mt="xs"
              variant="light"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate({ to: "/collection" })}
            >
              Back to collections
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid pt="md" pb="md">
      <Stack gap="md">
        <Stack gap={4}>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            px={0}
            fw={600}
            style={{ alignSelf: "flex-start" }}
            onClick={() => navigate({ to: "/collection" })}
          >
            Back to collections
          </Button>

          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={2}>
              <Group gap="sm" align="center">
                <Title order={2}>{collection.name}</Title>
                <Badge variant="light" color="indigo">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                {collection.description
                  ? String(collection.description)
                  : "No description provided."}
              </Text>
            </Stack>

            <Button
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={goToEdit}
            >
              Edit collection
            </Button>
          </Group>
        </Stack>

        {items.length === 0 ? (
          <Card withBorder p="xl">
            <Stack align="center" gap="xs">
              <IconBooks size={36} />
              <Text fw={600}>This collection doesn't have any items yet</Text>
              <Text c="dimmed" size="sm" ta="center">
                Add media to this collection to see it here.
              </Text>
              <Button
                mt="xs"
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={goToEdit}
              >
                Edit collection
              </Button>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid
            spacing={{ base: "xs", md: "md" }}
            cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
          >
            <AnimatePresence mode="popLayout">
              {items.map((record) => (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.2,
                    layout: { duration: 0.25 },
                  }}
                >
                  <MediaCard
                    media={record}
                    onView={(mediaId) =>
                      navigate({
                        to: "/media/view/$id",
                        params: { id: mediaId },
                        viewTransition: true,
                      })
                    }
                    onEdit={(mediaId) =>
                      navigate({
                        to: "/media/update/$id",
                        params: { id: mediaId },
                      })
                    }
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
