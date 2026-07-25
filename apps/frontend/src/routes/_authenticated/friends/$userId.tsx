import { EmptyState } from "#/components/EmptyState";
import { FriendMediaGrid } from "#/features/friends/components/FriendMediaGrid";
import { friendMediaQueryOptions } from "#/features/friends/queries";
import {
  Avatar,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconMovie } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
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
              {records.length} shared {records.length === 1 ? "entry" : "entries"}
            </Text>
          </Stack>
        </Group>

        {records.length === 0 ? (
          <EmptyState
            icon={<IconMovie size={36} />}
            title="Nothing shared yet"
            description={`${friend.name} hasn't shared any entries with friends.`}
          />
        ) : (
          <FriendMediaGrid records={records} />
        )}
      </Stack>
    </Container>
  );
}
