import { getApiErrorMessage } from "#/lib/api";
import { statusHistoryQueryOptions } from "#/features/media/queries";
import { capitalizeWords } from "#/utils/strings";
import {
  Alert,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  Timeline,
} from "@mantine/core";
import { IconHistory, IconPlus, IconSwitch3 } from "@tabler/icons-react";
import type { StatusHistoryRecord } from "@media-voyage/shared/api";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getStatusColor } from "../display";

type StatusHistoryModalProps = {
  opened: boolean;
  onClose: () => void;
  mediaId: string;
};

const formatChangedAt = (value: StatusHistoryRecord["changedAt"]) =>
  dayjs(value).format("MMM D, YYYY · h:mm A");

function getSourceLabel(source: string) {
  switch (source) {
    case "created":
      return "Added to your library";
    case "form":
      return "Updated from the edit form";
    case "quick_action":
      return "Updated from a quick action";
    case "migration":
      return "Imported from earlier activity";
    default:
      return "Status update";
  }
}

function getEventTitle(entry: StatusHistoryRecord) {
  if (!entry.fromStatus) {
    return `Added as ${capitalizeWords(entry.toStatus)}`;
  }

  return `${capitalizeWords(entry.fromStatus)} → ${capitalizeWords(entry.toStatus)}`;
}

function HistoryBullet({ entry }: { entry: StatusHistoryRecord }) {
  return (
    <ThemeIcon
      size={28}
      radius="xl"
      variant="light"
      color={getStatusColor(entry.toStatus)}
    >
      {entry.fromStatus ? <IconSwitch3 size={15} /> : <IconPlus size={15} />}
    </ThemeIcon>
  );
}

export function StatusHistoryModal({
  opened,
  onClose,
  mediaId,
}: StatusHistoryModalProps) {
  const {
    data: history = [],
    isPending,
    isError,
    error,
  } = useQuery({
    ...statusHistoryQueryOptions(mediaId),
    enabled: opened,
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      title={
        <Group gap="xs">
          <ThemeIcon variant="light">
            <IconHistory size={16} />
          </ThemeIcon>
          <Text fw={700}>Status history</Text>
        </Group>
      }
    >
      {isPending ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : isError ? (
        <Alert color="red" title="History unavailable">
          {getApiErrorMessage(error, "Could not load status history.")}
        </Alert>
      ) : history.length === 0 ? (
        <Text c="dimmed" size="sm">
          No status changes have been recorded yet.
        </Text>
      ) : (
        <Timeline bulletSize={28} lineWidth={2}>
          {history.map((entry) => (
            <Timeline.Item
              key={entry.id}
              bullet={<HistoryBullet entry={entry} />}
              title={
                <Group gap="xs" wrap="wrap">
                  <Text size="sm" fw={700}>
                    {getEventTitle(entry)}
                  </Text>
                  <Badge
                    size="xs"
                    variant="light"
                    color={getStatusColor(entry.toStatus)}
                  >
                    {capitalizeWords(entry.toStatus)}
                  </Badge>
                </Group>
              }
            >
              <Stack gap={3} mt={4}>
                <Text size="xs" c="dimmed">
                  {formatChangedAt(entry.changedAt)}
                </Text>
                <Text size="xs" c="dimmed">
                  {getSourceLabel(entry.source)}
                  {entry.progressSnapshot !== null
                    ? ` · ${entry.progressSnapshot}% progress`
                    : ""}
                </Text>
              </Stack>
            </Timeline.Item>
          ))}
        </Timeline>
      )}

      <Button variant="subtle" mt="md" onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}
