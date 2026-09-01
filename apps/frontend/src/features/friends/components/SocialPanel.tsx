import { authClient } from "#/auth/authClient";
import { confirmDelete } from "#/lib/confirmModal";
import { getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { showErrorNotification } from "#/lib/notifications";
import {
  ActionIcon,
  Avatar,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import type { ReactionRecord } from "@media-voyage/shared/api";
import {
  IconMessageCircle,
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import {
  addComment,
  deleteComment,
  friendMediaCommentsOptions,
  setReaction,
} from "../queries";

/** Comma-joined names, with the viewer rendered as "You" and listed first. */
function reactorNames(reactions: ReactionRecord[], viewerId?: string) {
  return reactions
    .map((reaction) => ({
      ...reaction,
      label: reaction.userId === viewerId ? "You" : reaction.name,
    }))
    .sort((a, b) => (a.label === "You" ? -1 : b.label === "You" ? 1 : 0))
    .map((reaction) => reaction.label)
    .join(", ");
}

type SocialPanelProps = {
  userMediaId: string;
  reactions: ReactionRecord[];
  /** Owner of the entry — they may delete any comment on it. */
  ownerId: string;
};

export function SocialPanel({
  userMediaId,
  reactions,
  ownerId,
}: SocialPanelProps) {
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const viewerId = session?.user.id;
  const [body, setBody] = useState("");

  const { data: comments } = useQuery(friendMediaCommentsOptions(userMediaId));

  const likes = reactions.filter((reaction) => reaction.value > 0);
  const dislikes = reactions.filter((reaction) => reaction.value < 0);
  const myReaction =
    reactions.find((reaction) => reaction.userId === viewerId)?.value ?? null;

  const invalidateEntry = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.friends.entry(userMediaId),
      }),
      // Also covers the owner viewing this entry via their own library page.
      queryClient.invalidateQueries({
        queryKey: queryKeys.userMedia.detail(userMediaId),
      }),
    ]);

  const reactionMutation = useMutation({
    mutationFn: (value: 1 | -1 | null) => setReaction(userMediaId, value),
    onError: (error) =>
      showErrorNotification({
        title: "Could not save reaction",
        message: getApiErrorMessage(error),
      }),
    onSettled: () =>
      Promise.all([
        invalidateEntry(),
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.feed }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.friends.mediaAll,
        }),
      ]),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(userMediaId, { body: body.trim() }),
    onSuccess: () => setBody(""),
    onError: (error) =>
      showErrorNotification({
        title: "Could not post comment",
        message: getApiErrorMessage(error),
      }),
    onSettled: invalidateEntry,
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onError: (error) =>
      showErrorNotification({
        title: "Could not delete comment",
        message: getApiErrorMessage(error),
      }),
    onSettled: invalidateEntry,
  });

  // Clicking the reaction you already have clears it.
  const toggleReaction = (value: 1 | -1) =>
    reactionMutation.mutate(myReaction === value ? null : value);

  const canDelete = (authorId: string) =>
    authorId === viewerId || ownerId === viewerId;

  return (
    <Paper withBorder p={{ base: "md", sm: "lg" }}>
      <Stack gap="lg">
        <Stack gap="sm">
          <Group gap="xs">
            <Button
              variant={myReaction === 1 ? "filled" : "default"}
              size="compact-md"
              leftSection={
                myReaction === 1 ? (
                  <IconThumbUpFilled size={16} />
                ) : (
                  <IconThumbUp size={16} />
                )
              }
              loading={reactionMutation.isPending}
              onClick={() => toggleReaction(1)}
            >
              {likes.length}
            </Button>

            <Button
              variant={myReaction === -1 ? "filled" : "default"}
              color={myReaction === -1 ? "red" : undefined}
              size="compact-md"
              leftSection={
                myReaction === -1 ? (
                  <IconThumbDownFilled size={16} />
                ) : (
                  <IconThumbDown size={16} />
                )
              }
              loading={reactionMutation.isPending}
              onClick={() => toggleReaction(-1)}
            >
              {dislikes.length}
            </Button>
          </Group>

          {likes.length > 0 && (
            <Text size="xs" c="dimmed">
              👍 {reactorNames(likes, viewerId)}
            </Text>
          )}
          {dislikes.length > 0 && (
            <Text size="xs" c="dimmed">
              👎 {reactorNames(dislikes, viewerId)}
            </Text>
          )}
        </Stack>

        <Stack gap="sm">
          <Group gap="xs">
            <ThemeIcon variant="light" c="primary" size={30} radius="sm">
              <IconMessageCircle size={17} />
            </ThemeIcon>
            <Title order={4}>Comments</Title>
            <Text size="sm" c="dimmed">
              {comments?.length ?? 0}
            </Text>
          </Group>

          {comments?.length === 0 && (
            <Text size="sm" c="dimmed">
              No comments yet — start the conversation.
            </Text>
          )}

          <Stack gap="md">
            {comments?.map((comment) => (
              <Group key={comment.id} align="flex-start" wrap="nowrap" gap="sm">
                <Avatar
                  size="sm"
                  radius="xl"
                  name={comment.name}
                  color="accent"
                />

                <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
                  <Group gap="xs" wrap="wrap">
                    <Text size="sm" fw={600}>
                      {comment.userId === viewerId ? "You" : comment.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {dayjs(comment.createdAt).format("MMM DD, YYYY · HH:mm")}
                    </Text>
                  </Group>
                  <Text
                    size="sm"
                    lh={1.6}
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {comment.body}
                  </Text>
                </Stack>

                {canDelete(comment.userId) && (
                  <Tooltip label="Delete comment" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label="Delete comment"
                      loading={deleteMutation.isPending}
                      onClick={() =>
                        confirmDelete({
                          title: "Delete comment",
                          message:
                            "This removes the comment for everyone. This can't be undone.",
                          onConfirm: () => deleteMutation.mutate(comment.id),
                        })
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            ))}
          </Stack>

          <Stack gap="xs">
            <Textarea
              placeholder="Add a comment…"
              autosize
              minRows={2}
              maxRows={6}
              maxLength={2000}
              value={body}
              onChange={(event) => setBody(event.currentTarget.value)}
            />
            <Button
              style={{ alignSelf: "flex-end" }}
              disabled={!body.trim()}
              loading={commentMutation.isPending}
              onClick={() => commentMutation.mutate()}
            >
              Post comment
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
