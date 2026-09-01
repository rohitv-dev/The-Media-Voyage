import { Button, Group, Paper, Text, ThemeIcon } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { useState } from "react";
import { StatusHistoryModal } from "../StatusHistoryModal";
import { accentText } from "./constants";

type MediaViewStatusHistoryProps = {
  mediaId: string;
  readOnly?: boolean;
};

export function MediaViewStatusHistory({
  mediaId,
  readOnly,
}: MediaViewStatusHistoryProps) {
  const [opened, setOpened] = useState(false);

  if (readOnly) return null;

  return (
    <>
      <Paper withBorder p="sm">
        <Group justify="space-between" gap="md" wrap="wrap">
          <Group gap="xs">
            <ThemeIcon variant="light" c="primary" size={30} radius="sm">
              <IconHistory size={17} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={800} style={{ color: accentText }}>
                Status history
              </Text>
              <Text size="xs" c="dimmed">
                See how this entry moved through your library.
              </Text>
            </div>
          </Group>
          <Button variant="light" size="xs" onClick={() => setOpened(true)}>
            View timeline
          </Button>
        </Group>
      </Paper>

      <StatusHistoryModal
        opened={opened}
        onClose={() => setOpened(false)}
        mediaId={mediaId}
      />
    </>
  );
}
