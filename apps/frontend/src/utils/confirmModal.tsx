import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";

type ConfirmDeleteOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function confirmDelete({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
}: ConfirmDeleteOptions) {
  modals.openConfirmModal({
    title,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: confirmLabel, cancel: "Cancel" },
    confirmProps: { color: "red" },
    onConfirm,
  });
}
