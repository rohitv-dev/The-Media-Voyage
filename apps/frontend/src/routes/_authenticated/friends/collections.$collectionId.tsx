import { EmptyState } from "#/components/EmptyState";
import { FriendMediaGrid } from "#/features/friends/components/FriendMediaGrid";
import { friendCollectionDetailOptions } from "#/features/friends/queries";
import { Button, Container, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconBooks } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/friends/collections/$collectionId",
)({
  loader: ({ context: { queryClient }, params: { collectionId } }) => {
    queryClient.ensureQueryData(friendCollectionDetailOptions(collectionId));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { collectionId } = Route.useParams();
  const router = useRouter();
  const { data } = useSuspenseQuery(
    friendCollectionDetailOptions(collectionId),
  );
  const { collection, data: records } = data;

  return (
    <Container size="xl" pt="md" pb="xl">
      <Stack gap="md">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          px={0}
          fw={600}
          style={{ alignSelf: "flex-start" }}
          onClick={() => router.history.back()}
        >
          Back
        </Button>

        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            {collection.ownerName}'s collection
          </Text>
          <Title order={2}>{collection.name}</Title>
          <Text c="dimmed" size="sm">
            {collection.description
              ? String(collection.description)
              : "No description provided."}
          </Text>
        </Stack>

        {records.length === 0 ? (
          <EmptyState
            icon={<IconBooks size={36} />}
            title="Nothing shared in this collection"
            /* The collection is shared but its entries individually are not. */
            description="The entries in this collection haven't been shared."
          />
        ) : (
          <FriendMediaGrid records={records} />
        )}
      </Stack>
    </Container>
  );
}
