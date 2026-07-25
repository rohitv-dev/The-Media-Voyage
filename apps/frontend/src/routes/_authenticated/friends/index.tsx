import { EmptyState } from "#/components/EmptyState";
import { FriendMediaGrid } from "#/features/friends/components/FriendMediaGrid";
import {
  friendRequestsQueryOptions,
  friendsFeedQueryOptions,
  friendsQueryOptions,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "#/features/friends/queries";
import { confirmDelete } from "#/utils/confirmModal";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  ActionIcon,
  Avatar,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import type { FriendRequestRecord } from "@media-voyage/shared/api";
import {
  IconCheck,
  IconMoodSmile,
  IconTrash,
  IconUserPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/friends/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(friendsQueryOptions);
    queryClient.ensureQueryData(friendRequestsQueryOptions);
    queryClient.ensureQueryData(friendsFeedQueryOptions);
  },
  component: RouteComponent,
});

function RequestRow({
  request,
  children,
}: {
  request: FriendRequestRecord;
  children: React.ReactNode;
}) {
  return (
    <Group justify="space-between" wrap="wrap" gap="sm">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Avatar size="sm" radius="xl" name={request.name} color="accent" />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" fw={600}>
            {request.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {request.email}
          </Text>
        </Stack>
      </Group>
      <Group gap="xs">{children}</Group>
    </Group>
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: friends } = useQuery(friendsQueryOptions);
  const { data: requests } = useQuery(friendRequestsQueryOptions);
  const { data: feed } = useQuery(friendsFeedQueryOptions);

  const refreshAll = () =>
    queryClient.invalidateQueries({ queryKey: ["friends"] });

  const requestMutation = useMutation({
    mutationFn: () => sendFriendRequest(email.trim()),
    onSuccess: (result) => {
      setEmail("");
      showSuccessNotification({
        message: result.autoAccepted
          ? "They had already sent you a request — you're now friends."
          : "Friend request sent.",
      });
    },
    onError: (error) =>
      showErrorNotification({
        title: "Could not send request",
        message: error.message,
      }),
    onSettled: refreshAll,
  });

  const respondMutation = useMutation({
    mutationFn: ({
      friendshipId,
      action,
    }: {
      friendshipId: string;
      action: "accept" | "decline";
    }) => respondToFriendRequest(friendshipId, action),
    onSuccess: (_result, variables) =>
      showSuccessNotification({
        message:
          variables.action === "accept"
            ? "Friend request accepted."
            : "Friend request declined.",
      }),
    onError: (error) =>
      showErrorNotification({
        title: "Could not respond",
        message: error.message,
      }),
    onSettled: refreshAll,
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeFriend(userId),
    onSuccess: () => showSuccessNotification({ message: "Removed." }),
    onError: (error) =>
      showErrorNotification({
        title: "Could not remove",
        message: error.message,
      }),
    onSettled: refreshAll,
  });

  const incoming = requests?.incoming ?? [];
  const outgoing = requests?.outgoing ?? [];

  return (
    <Container size="lg" pt="md" pb="xl">
      <Stack gap="lg">
        <Stack gap={2}>
          <Title order={2}>Friends</Title>
          <Text c="dimmed" size="sm">
            Friends can see the entries you've shared, and react or comment on
            them.
          </Text>
        </Stack>

        <Card withBorder radius="lg" p="lg">
          <Stack gap="sm">
            <Stack gap={2}>
              <Text fw={700}>Add a friend</Text>
              <Text size="sm" c="dimmed">
                Enter the email address they signed up with.
              </Text>
            </Stack>
            <Group align="flex-end" gap="sm" wrap="wrap">
              <TextInput
                flex={1}
                miw={220}
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(event) => setEmail(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && email.trim()) {
                    requestMutation.mutate();
                  }
                }}
              />
              <Button
                leftSection={<IconUserPlus size={16} />}
                disabled={!email.trim()}
                loading={requestMutation.isPending}
                onClick={() => requestMutation.mutate()}
              >
                Send request
              </Button>
            </Group>
          </Stack>
        </Card>

        {(incoming.length > 0 || outgoing.length > 0) && (
          <Card withBorder radius="lg" p="lg">
            <Stack gap="md">
              {incoming.length > 0 && (
                <Stack gap="sm">
                  <Group gap="xs">
                    <Text fw={700}>Requests received</Text>
                    <Badge size="sm">{incoming.length}</Badge>
                  </Group>
                  {incoming.map((request) => (
                    <RequestRow key={request.friendshipId} request={request}>
                      <Button
                        size="xs"
                        leftSection={<IconCheck size={15} />}
                        loading={respondMutation.isPending}
                        onClick={() =>
                          respondMutation.mutate({
                            friendshipId: request.friendshipId,
                            action: "accept",
                          })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="gray"
                        leftSection={<IconX size={15} />}
                        loading={respondMutation.isPending}
                        onClick={() =>
                          respondMutation.mutate({
                            friendshipId: request.friendshipId,
                            action: "decline",
                          })
                        }
                      >
                        Decline
                      </Button>
                    </RequestRow>
                  ))}
                </Stack>
              )}

              {outgoing.length > 0 && (
                <Stack gap="sm">
                  <Text fw={700}>Requests sent</Text>
                  {outgoing.map((request) => (
                    <RequestRow key={request.friendshipId} request={request}>
                      <Badge size="sm" variant="light" color="gray">
                        Pending
                      </Badge>
                      <Button
                        size="xs"
                        variant="subtle"
                        color="red"
                        loading={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(request.userId)}
                      >
                        Cancel
                      </Button>
                    </RequestRow>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        <Card withBorder radius="lg" p="lg">
          <Stack gap="sm">
            <Text fw={700}>Your friends</Text>

            {friends?.length === 0 ? (
              <Text size="sm" c="dimmed">
                No friends yet — send a request above to get started.
              </Text>
            ) : (
              friends?.map((friend) => (
                <Paper key={friend.userId} withBorder p="sm" radius="md">
                  <Group justify="space-between" wrap="wrap" gap="sm">
                    <Group
                      gap="sm"
                      wrap="nowrap"
                      style={{ minWidth: 0, cursor: "pointer" }}
                      onClick={() =>
                        navigate({
                          to: "/friends/$userId",
                          params: { userId: friend.userId },
                        })
                      }
                    >
                      <Avatar
                        radius="xl"
                        name={friend.name}
                        src={friend.image}
                        color="accent"
                      />
                      <Stack gap={0} style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600}>
                          {friend.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {friend.sharedCount} shared{" "}
                          {friend.sharedCount === 1 ? "entry" : "entries"}
                        </Text>
                      </Stack>
                    </Group>

                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() =>
                          navigate({
                            to: "/friends/$userId",
                            params: { userId: friend.userId },
                          })
                        }
                      >
                        View library
                      </Button>
                      <Tooltip label="Remove friend" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label={`Remove ${friend.name}`}
                          onClick={() =>
                            confirmDelete({
                              title: "Remove friend",
                              message: `${friend.name} will no longer see your shared entries. Reactions and comments they've already left stay put.`,
                              confirmLabel: "Remove",
                              onConfirm: () =>
                                removeMutation.mutate(friend.userId),
                            })
                          }
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Paper>
              ))
            )}
          </Stack>
        </Card>

        <Stack gap="sm">
          <Text fw={700}>Recent from friends</Text>

          {!feed?.length ? (
            <EmptyState
              icon={
                friends?.length ? (
                  <IconMoodSmile size={36} />
                ) : (
                  <IconUsers size={36} />
                )
              }
              title={
                friends?.length
                  ? "Nothing shared yet"
                  : "Add a friend to see their activity"
              }
              description={
                friends?.length
                  ? "Your friends haven't shared any entries yet."
                  : "Once you're connected, their shared entries show up here."
              }
            />
          ) : (
            <FriendMediaGrid records={feed} showOwner />
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
