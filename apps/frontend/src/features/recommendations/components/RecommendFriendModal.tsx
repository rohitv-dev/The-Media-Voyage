import {
  Alert,
  Anchor,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import type {
  CreateFriendRecommendationInput,
  FriendRecord,
} from "@media-voyage/shared/api";
import { IconAlertCircle, IconSend, IconUsers } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type FriendRecommendationFormInput = Pick<
  CreateFriendRecommendationInput,
  "recipientId" | "senderNote"
>;

type RecommendFriendModalProps = {
  opened: boolean;
  onClose: () => void;
  mediaTitle: string;
  friends: FriendRecord[];
  onSubmit: (input: FriendRecommendationFormInput) => void;
  pending?: boolean;
  friendsLoading?: boolean;
  friendsError?: string | null;
  submitError?: string | null;
};

export function RecommendFriendModal({
  opened,
  onClose,
  mediaTitle,
  friends,
  onSubmit,
  pending = false,
  friendsLoading = false,
  friendsError,
  submitError,
}: RecommendFriendModalProps) {
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [senderNote, setSenderNote] = useState("");

  useEffect(() => {
    if (!opened) {
      setRecipientId(null);
      setSenderNote("");
    }
  }, [opened]);

  const handleSubmit = () => {
    if (!recipientId) return;

    const trimmedNote = senderNote.trim();
    onSubmit({
      recipientId,
      ...(trimmedNote ? { senderNote: trimmedNote } : {}),
    });
  };

  const friendOptions = friends.map((friend) => ({
    value: friend.userId,
    label: friend.email ? friend.name + " (" + friend.email + ")" : friend.name,
  }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      closeOnEscape={!pending}
      title={
        <Group gap="xs">
          <IconSend size={18} />
          <Text fw={700}>Recommend to a friend</Text>
        </Group>
      }
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Send{" "}
          <Text span fw={700} c="inherit">
            {mediaTitle}
          </Text>{" "}
          to someone who might enjoy it.
        </Text>

        {friendsError ? (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="red"
            title="Friends could not be loaded"
          >
            {friendsError}
          </Alert>
        ) : friendsLoading ? (
          <Select
            label="Send to"
            placeholder="Loading friends…"
            data={[]}
            disabled
            searchable
          />
        ) : friends.length === 0 ? (
          <Alert
            icon={<IconUsers size={18} />}
            color="gray"
            title="No friends yet"
          >
            <Text size="sm">
              Add a friend first, then you can recommend media to them.{" "}
              <Anchor component={Link} to="/friends">
                Manage friends
              </Anchor>
            </Text>
          </Alert>
        ) : (
          <Select
            label="Send to"
            placeholder="Choose a friend"
            data={friendOptions}
            value={recipientId}
            onChange={setRecipientId}
            searchable
            required
            nothingFoundMessage="No matching friends"
          />
        )}

        <Textarea
          label="Add a note"
          description="Optional message your friend will see with the recommendation."
          placeholder="Hey, you gotta watch this, it's awesome"
          value={senderNote}
          onChange={(event) => setSenderNote(event.currentTarget.value)}
          minRows={3}
          maxLength={2000}
          autosize
          disabled={pending}
        />

        {submitError && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="red"
            title="Recommendation not sent"
          >
            {submitError}
          </Alert>
        )}

        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            leftSection={<IconSend size={17} />}
            onClick={handleSubmit}
            loading={pending}
            disabled={!recipientId || friendsLoading || friends.length === 0}
          >
            Send recommendation
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
