import {
  ActionIcon,
  Button,
  Grid,
  Group,
  SimpleGrid,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconTrash } from "@tabler/icons-react";

type FormActionsProps = {
  mode: "add" | "update";
  isPending: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
};

export function MobileFormActions({
  mode,
  isPending,
  onCancel: handleCancel,
  onDelete,
  isDeletePending,
}: FormActionsProps) {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      {mode === "update" && onDelete ? (
        <Tooltip label="Delete media">
          <ActionIcon
            type="button"
            variant="subtle"
            color="red"
            size="md"
            loading={isDeletePending}
            disabled={isPending}
            onClick={onDelete}
            aria-label="Delete media"
          >
            <IconTrash size={17} />
          </ActionIcon>
        </Tooltip>
      ) : (
        <span />
      )}

      <Group gap="xs" wrap="nowrap">
        <Button
          type="button"
          variant="light"
          size="sm"
          disabled={isPending}
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          leftSection={<IconCheck size={17} />}
          loading={isPending}
        >
          {mode === "add" ? "Save Media" : "Update Media"}
        </Button>
      </Group>
    </Group>
  );
}

export function FormActions({
  mode,
  isPending,
  onCancel: handleCancel,
  onDelete,
  isDeletePending,
}: FormActionsProps) {
  return (
    <Grid.Col span={{ xs: 12 }} visibleFrom="sm">
      <Group
        justify="space-between"
        align="center"
        wrap="wrap-reverse"
        gap="md"
      >
        {mode === "update" && onDelete ? (
          <Button
            variant="outline"
            color="red"
            leftSection={<IconTrash size={16} />}
            loading={isDeletePending}
            disabled={isPending}
            onClick={onDelete}
            w={{ base: "100%", xs: "auto" }}
          >
            Delete Media
          </Button>
        ) : (
          <span />
        )}

        <SimpleGrid
          cols={{ base: 1, xs: 2 }}
          spacing="md"
          w={{ base: "100%", xs: 320 }}
          ml={{ xs: "auto" }}
        >
          <Button variant="light" disabled={isPending} onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            leftSection={<IconCheck size={18} />}
            loading={isPending}
          >
            {mode === "add" ? "Save Media" : "Update Media"}
          </Button>
        </SimpleGrid>
      </Group>
    </Grid.Col>
  );
}
