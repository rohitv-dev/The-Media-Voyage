import { MediaCard } from "#/features/media/components/MediaCard";
import { CollectionVisibilityControl } from "#/features/media-collection/components/CollectionVisibilityControl";
import { CollectionDetailsModal } from "#/features/media-collection/components/CollectionDetailsModal";
import { CopyPublicLinkButton } from "#/features/public/components/CopyPublicLinkButton";
import { EmptyState } from "#/components/EmptyState";
import {
  collectionItemsDetailedQueryOptions,
  collectionQueryOptions,
} from "#/features/media-collection/queries";
import {
  Badge,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconBooks,
  IconEdit,
  IconPencil,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { gridItemMotionProps } from "#/theme/motion";

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
  const reduceMotion = useAppReducedMotion();
  const [detailsOpened, { open: openDetails, close: closeDetails }] =
    useDisclosure();
  const { data: collections } = useSuspenseQuery(collectionQueryOptions);
  const { data: items } = useSuspenseQuery(
    collectionItemsDetailedQueryOptions(id),
  );
  const collection = collections.find((entry) => entry.id === id);

  const goToItems = () =>
    navigate({ to: "/collection/edit/$id", params: { id } });

  if (!collection) {
    return (
      <Container size="xl" pt="md" pb="md">
        <EmptyState
          icon={<IconBooks size={36} />}
          title="Collection not found"
          description="This collection doesn't exist or is no longer available to you."
        >
          <Button
            mt="xs"
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
                <Badge variant="light" color="accent">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
              </Group>
              <Text c="dimmed" size="sm">
                {collection.description
                  ? String(collection.description)
                  : "No description provided."}
              </Text>
            </Stack>

            <Group gap="md" wrap="wrap">
              <CollectionVisibilityControl collection={collection} />

              {collection.visibility === "public" && (
                <CopyPublicLinkButton resource="collection" resourceId={id} />
              )}

              <Button
                variant="default"
                leftSection={<IconPencil size={16} />}
                onClick={openDetails}
              >
                Edit details
              </Button>

              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={goToItems}
              >
                Edit items
              </Button>
            </Group>
          </Group>
        </Stack>

        {items.length === 0 ? (
          <EmptyState
            icon={<IconBooks size={36} />}
            title="This collection doesn't have any items yet"
            description="Add media to this collection to see it here."
          >
            <Button
              mt="xs"
              variant="light"
              leftSection={<IconEdit size={16} />}
              onClick={goToItems}
            >
              Add items
            </Button>
          </EmptyState>
        ) : (
          <SimpleGrid
            spacing={{ base: "xs", md: "md" }}
            cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
          >
            <AnimatePresence mode="popLayout">
              {items.map((record) => (
                <motion.div
                  key={record.id}
                  {...gridItemMotionProps(reduceMotion)}
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

      <CollectionDetailsModal
        collection={collection}
        opened={detailsOpened}
        onClose={closeDetails}
      />
    </Container>
  );
}
