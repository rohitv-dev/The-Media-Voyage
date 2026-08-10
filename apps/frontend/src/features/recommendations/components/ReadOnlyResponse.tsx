import {
  Avatar,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import type { RecommendationDetail } from "@media-voyage/shared/api";
import {
  IconBook,
  IconCheck,
  IconClock,
  IconSend,
} from "@tabler/icons-react";
import { MessagePanel } from "./MessagePanel";

function formatOutcome(outcome: RecommendationDetail["outcome"]) {
  switch (outcome) {
    case "added_to_library":
      return "Added to library";
    case "already_completed":
      return "Already completed";
    case "not_interested":
      return "Not interested";
    default:
      return "Not selected";
  }
}

export function ReadOnlyResponse({
  detail,
  onOpenLibrary,
}: {
  detail: RecommendationDetail;
  onOpenLibrary: (userMediaId: string) => void;
}) {
  const recipientUserMediaId = detail.recipientUserMediaId;

  return (
    <Stack gap="md">
      <Group gap="sm" wrap="nowrap">
        <Avatar
          src={detail.sender.image}
          name={detail.sender.name}
          color="accent"
          radius="xl"
        />
        <Text size="sm" fw={700}>
          {detail.viewerRole === "recipient"
            ? detail.sender.name + " recommended this to you."
            : "You recommended this to " + detail.recipient.name + "."}
        </Text>
      </Group>

      {detail.senderNote && (
        <MessagePanel
          label={detail.viewerRole === "sender" ? "Your note" : "Sender's note"}
          icon={<IconSend size={15} />}
        >
          {detail.senderNote}
        </MessagePanel>
      )}

      {detail.status === "pending" ? (
        <Paper withBorder p="sm">
          <Group gap="xs">
            <ThemeIcon variant="light" color="orange" size={24} radius="xl">
              <IconClock size={15} />
            </ThemeIcon>
            <Text size="sm" fw={600}>
              Waiting for {detail.recipient.name} to respond.
            </Text>
          </Group>
        </Paper>
      ) : (
        <Paper withBorder p="sm">
          <Group gap="xs" mb={4}>
            <ThemeIcon variant="light" color="teal" size={24} radius="xl">
              <IconCheck size={15} />
            </ThemeIcon>
            <Text size="xs" fw={800} tt="uppercase" c="dimmed">
              Response
            </Text>
          </Group>
          <Text size="sm" fw={700}>
            {formatOutcome(detail.outcome)}
          </Text>
          {detail.recipientNote && (
            <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>
              {detail.recipientNote}
            </Text>
          )}
        </Paper>
      )}

      {detail.viewerRole === "recipient" && recipientUserMediaId && (
        <Button
          variant="light"
          leftSection={<IconBook size={17} />}
          onClick={() => onOpenLibrary(recipientUserMediaId)}
        >
          Open in my library
        </Button>
      )}
    </Stack>
  );
}
