import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  Group,
  Paper,
  Radio,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import type {
  RecommendationDetail,
  ResolveRecommendationInput,
} from "@media-voyage/shared/api";
import {
  IconAlertCircle,
  IconBook,
  IconCheck,
  IconMessageCircle,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { MessagePanel } from "./MessagePanel";

type FriendResolutionOutcome = Extract<
  ResolveRecommendationInput["outcome"],
  "added_to_library" | "already_completed" | "not_interested"
>;

const outcomeLabels: Record<FriendResolutionOutcome, string> = {
  added_to_library: "Add to library",
  already_completed: "Already completed",
  not_interested: "Not interested",
};

type ExistingRecipientEntry = {
  id: string;
  status: RecommendationDetail["existingRecipientUserMediaStatus"];
};

type ResponseOptions = {
  defaultOutcome: FriendResolutionOutcome;
  outcomes: FriendResolutionOutcome[];
};

function getExistingRecipientEntry(
  detail: RecommendationDetail,
): ExistingRecipientEntry | null {
  if (!detail.existingRecipientUserMediaId) return null;

  return {
    id: detail.existingRecipientUserMediaId,
    status: detail.existingRecipientUserMediaStatus,
  };
}

function getResponseOptions(
  existingEntry: ExistingRecipientEntry | null,
): ResponseOptions {
  if (!existingEntry) {
    return {
      defaultOutcome: "added_to_library",
      outcomes: ["added_to_library", "already_completed", "not_interested"],
    };
  }

  if (existingEntry.status === "completed") {
    return {
      defaultOutcome: "already_completed",
      outcomes: ["already_completed", "not_interested"],
    };
  }

  return {
    defaultOutcome: "not_interested",
    outcomes: ["not_interested"],
  };
}

export function PendingResponse({
  detail,
  resolvePending,
  resolveError,
  onResolve,
  onOpenLibrary,
}: {
  detail: RecommendationDetail;
  resolvePending: boolean;
  resolveError?: string | null;
  onResolve: (input: ResolveRecommendationInput) => void;
  onOpenLibrary: (userMediaId: string) => void;
}) {
  const existingEntry = getExistingRecipientEntry(detail);
  const { defaultOutcome, outcomes } = getResponseOptions(existingEntry);
  const [outcome, setOutcome] =
    useState<FriendResolutionOutcome>(defaultOutcome);
  const [addToLibrary, setAddToLibrary] = useState(false);
  const [recipientNote, setRecipientNote] = useState("");

  useEffect(() => {
    setOutcome(defaultOutcome);
    setAddToLibrary(false);
    setRecipientNote("");
  }, [defaultOutcome, detail.id]);

  const handleResolve = () => {
    const trimmedNote = recipientNote.trim();
    onResolve({
      outcome,
      addToLibrary: outcome === "already_completed" ? addToLibrary : false,
      ...(trimmedNote ? { recipientNote: trimmedNote } : {}),
    });
  };

  return (
    <Stack gap="md">
      {detail.origin === "friend" && (
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={detail.sender.image}
            name={detail.sender.name}
            color="accent"
            radius="xl"
          />
          <Stack gap={0}>
            <Text size="sm" fw={700}>
              {detail.sender.name} recommended this to you.
            </Text>
            <Text size="xs" c="dimmed">
              Choose what happens next.
            </Text>
          </Stack>
        </Group>
      )}

      {detail.origin === "system" && (
        <Alert
          icon={<IconSparkles size={18} />}
          color="violet"
          title="Why this was recommended"
        >
          {detail.systemReason}
        </Alert>
      )}

      {detail.origin === "friend" && detail.senderNote && (
        <MessagePanel
          label="Message from your friend"
          icon={<IconMessageCircle size={15} />}
        >
          {detail.senderNote}
        </MessagePanel>
      )}

      {existingEntry && (
        <Paper withBorder p="sm">
          <Group justify="space-between" gap="sm" wrap="wrap">
            <Group gap="xs">
              <ThemeIcon variant="light" color="teal" size={26} radius="xl">
                <IconBook size={15} />
              </ThemeIcon>
              <Text size="sm" fw={600}>
                This title is already in your library.
              </Text>
            </Group>
            <Button
              variant="light"
              size="xs"
              onClick={() => onOpenLibrary(existingEntry.id)}
            >
              Open in my library
            </Button>
          </Group>
        </Paper>
      )}

      <Radio.Group label="Your response" value={outcome} onChange={setOutcome}>
        <Stack gap="xs" mt="xs">
          {outcomes.map((value) => (
            <Radio
              key={value}
              value={value}
              label={outcomeLabels[value]}
              disabled={resolvePending}
            />
          ))}
        </Stack>
      </Radio.Group>

      {outcome === "already_completed" && !existingEntry && (
        <Checkbox
          label="Also add it to my library"
          checked={addToLibrary}
          onChange={(event) => setAddToLibrary(event.currentTarget.checked)}
          disabled={resolvePending}
        />
      )}

      <Textarea
        label="Add a note"
        description="Optional reply your friend will see."
        placeholder="I watched this already - great recommendation!"
        value={recipientNote}
        onChange={(event) => setRecipientNote(event.currentTarget.value)}
        minRows={3}
        maxLength={2000}
        autosize
        disabled={resolvePending}
      />

      {resolveError && (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="red"
          title="Could not save your response"
        >
          {resolveError}
        </Alert>
      )}

      <Button
        leftSection={
          outcome === "added_to_library" ? (
            <IconBook size={17} />
          ) : outcome === "not_interested" ? (
            <IconX size={17} />
          ) : (
            <IconCheck size={17} />
          )
        }
        loading={resolvePending}
        onClick={handleResolve}
      >
        {outcomeLabels[outcome]}
      </Button>
    </Stack>
  );
}
