import { Button, Group, Modal, Text, TextInput, ThemeIcon } from "@mantine/core";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";
import { showSuccessNotification } from "#/utils/notifications";

type SavePresetModalProps = {
  opened: boolean;
  onClose: () => void;
  onSave: (name: string) => { ok: boolean; error?: string };
};

export function SavePresetModal({
  opened,
  onClose,
  onSave,
}: SavePresetModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const handleClose = () => {
    setName("");
    setError(undefined);
    onClose();
  };

  const handleSave = () => {
    const result = onSave(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    showSuccessNotification({ message: `Saved preset "${name.trim()}"` });
    handleClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      title={
        <Group gap="xs">
          <ThemeIcon variant="light">
            <IconDeviceFloppy size={16} />
          </ThemeIcon>
          <Text fw={700}>Save filter preset</Text>
        </Group>
      }
    >
      <TextInput
        label="Preset name"
        placeholder="Planned books"
        value={name}
        error={error}
        autoFocus
        onChange={(e) => {
          setName(e.target.value);
          setError(undefined);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSave();
          }
        }}
      />

      <Group justify="flex-end" mt="md">
        <Button variant="light" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save</Button>
      </Group>
    </Modal>
  );
}
