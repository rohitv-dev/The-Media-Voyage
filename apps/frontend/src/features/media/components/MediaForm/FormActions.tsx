import { Grid, Group, SimpleGrid, Button } from "@mantine/core";
import { IconCheck, IconTrash } from "@tabler/icons-react";

type FormActionsProps = {
  mode: "add" | "update";
  isPending: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
};

export function FormActions({
  mode,
  isPending,
  onCancel: handleCancel,
  onDelete,
  isDeletePending,
}: FormActionsProps) {
  return (
    <Grid.Col span={{ xs: 12 }}>
      <Group justify="space-between" align="center" wrap="wrap-reverse" gap="md">
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
