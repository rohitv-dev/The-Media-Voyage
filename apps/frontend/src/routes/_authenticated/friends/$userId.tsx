import { EmptyState } from "#/components/EmptyState";
import { FriendMediaGrid } from "#/features/friends/components/FriendMediaGrid";
import {
  friendCollectionsQueryOptions,
  friendMediaQueryOptions,
} from "#/features/friends/queries";
import {
  Avatar,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconBooks, IconMovie } from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/friends/$userId")({
  loader: ({ context: { queryClient }, params: { userId } }) => {
    queryClient.ensureQueryData(friendMediaQueryOptions(userId));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(friendMediaQueryOptions(userId));
  const { data: collections } = useQuery(friendCollectionsQueryOptions(userId));
  const { friend, data: records } = data;

  return (
    <Container size="xl" pt="md" pb="xl">
      <Stack gap="md">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          px={0}
          fw={600}
          style={{ alignSelf: "flex-start" }}
          onClick={() => navigate({ to: "/friends" })}
        >
          Back to friends
        </Button>

        <Group gap="sm">
          <Avatar
            radius="xl"
            size="lg"
            name={friend.name}
            src={friend.image}
            color="accent"
          />
          <Stack gap={0}>
            <Title order={2}>{friend.name}</Title>
            <Text c="dimmed" size="sm">
              {records.length} {records.length === 1 ? "entry" : "entries"} from
              them
            </Text>
          </Stack>
        </Group>

        {collections && collections.length > 0 && (
          <Stack gap="xs">
            <Text fw={700}>Collections</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
              {collections.map((collection) => (
                <Paper
                  key={collection.id}
                  withBorder
                  p="md"
                  radius="md"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    navigate({
                      to: "/friends/collections/$collectionId",
                      params: { collectionId: collection.id },
                    })
                  }
                >
                  <Group gap="sm" wrap="nowrap">
                    <IconBooks size={20} />
                    <Stack gap={0} style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {collection.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {collection.itemCount} shared{" "}
                        {collection.itemCount === 1 ? "item" : "items"}
                      </Text>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </Stack>
        )}

        {records.length === 0 ? (
          <EmptyState
            icon={<IconMovie size={36} />}
            title="Nothing shared yet"
            description={`${friend.name} hasn't shared any entries with friends.`}
          />
        ) : (
          <>
            <Text fw={700}>All shared entries</Text>
            <FriendMediaGrid records={records} />
          </>
        )}
      </Stack>
    </Container>
  );
}
