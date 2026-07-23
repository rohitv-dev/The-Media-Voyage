import { Group, Kbd, Modal, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconKeyboard } from "@tabler/icons-react";

type ShortcutsHelpModalProps = {
  opened: boolean;
  onClose: () => void;
};

const shortcuts: { keys: string[]; description: string }[] = [
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
        {shortcuts.map(({ keys, description }) => (
          <Group key={description} justify="space-between" wrap="nowrap">
            <Text size="sm">{description}</Text>
            <Group gap={4} wrap="nowrap">
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
