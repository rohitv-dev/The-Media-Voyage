import { api } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import { Button, ColorInput, Group, Modal, Stack, TextInput } from "@mantine/core";
import type { TagFormSchema } from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// Tags and sources share an identical create-request shape ({ name, color }),
// so TagFormSchema doubles as the wire type for both — see
// packages/shared/src/api/tags.ts and sources.ts.
type NamedEntityFormBody = TagFormSchema;

type AddNamedEntityModalProps = {
  opened: boolean;
  onClose: () => void;
  basePath: string;
  entityLabel: string;
  invalidateKeys: string[][];
};

export function AddNamedEntityModal({
  opened,
  onClose,
  basePath,
  entityLabel,
  invalidateKeys,
}: AddNamedEntityModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("");

  const handleClose = () => {
    setName("");
    setColor("");
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api(basePath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color: color || null,
        } satisfies NamedEntityFormBody),
      }),
    onSuccess: async () => {
      await Promise.all(
        invalidateKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      showSuccessNotification({ message: `Added ${entityLabel} "${name.trim()}"` });
      handleClose();
    },
    onError: (error: Error) => {
      showErrorNotification({ message: error.message });
    },
  });

  const handleSave = () => {
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      centered
      title={`Add ${entityLabel}`}
    >
      <Stack gap="sm">
        <TextInput
          label="Name"
          placeholder={`e.g. ${entityLabel === "tag" ? "Cozy" : "Netflix"}`}
          value={name}
          autoFocus
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSave();
          }}
        />

        <ColorInput
          label="Color"
          placeholder="No color"
          value={color}
          onChange={setColor}
          format="hex"
          withEyeDropper={false}
        />

        <Group justify="flex-end" mt="sm">
          <Button variant="light" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={createMutation.isPending}
            disabled={!name.trim()}
          >
            Add {entityLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
