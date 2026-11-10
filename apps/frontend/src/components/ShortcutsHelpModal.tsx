import { Group, Kbd, Modal, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconKeyboard } from "@tabler/icons-react";

type ShortcutsHelpModalProps = {
  opened: boolean;
  onClose: () => void;
  onMediaView: boolean;
  characterShortcuts: boolean;
};

const shortcuts: { keys: string[]; description: string }[] = [
  { keys: ["Ctrl/⌘", "K"], description: "Open the command palette" },
  { keys: ["/"], description: "Focus the library search" },
  { keys: ["c"], description: "Add media" },
  { keys: ["r"], description: "Reset filters" },
  { keys: ["Enter"], description: "Apply filters (while in a filter field)" },
  { keys: ["Esc"], description: "Close the open dialog" },
  { keys: ["?"], description: "Show this help" },
];

export function ShortcutsHelpModal({
  opened,
  onClose,
  onMediaView,
  characterShortcuts,
}: ShortcutsHelpModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={
        <Group gap="xs">
          <ThemeIcon variant="light">
            <IconKeyboard size={16} />
          </ThemeIcon>
          <Text fw={700}>Keyboard shortcuts</Text>
        </Group>
      }
    >
      <Stack gap="sm">
        {onMediaView && (
          <>
            <Text fw={600} size="sm">
              This page
            </Text>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">Update media</Text>
              <Group gap={4} wrap="nowrap">
                {!characterShortcuts && <Kbd>Alt</Kbd>}
                <Kbd>u</Kbd>
              </Group>
            </Group>
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm">Back to Library</Text>
              <Group gap={4} wrap="nowrap">
                {!characterShortcuts && <Kbd>Alt</Kbd>}
                <Kbd>b</Kbd>
              </Group>
            </Group>
            <Text fw={600} size="sm">
              Global shortcuts
            </Text>
          </>
        )}
        {shortcuts.map(({ keys, description }) => (
          <Group key={description} justify="space-between" wrap="nowrap">
            <Text size="sm">{description}</Text>
            <Group gap={4} wrap="nowrap">
              {!characterShortcuts &&
                ["/", "c", "r", "?"].includes(keys[0]) && <Kbd>Alt</Kbd>}
              {keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </Group>
          </Group>
        ))}
      </Stack>
    </Modal>
  );
}
