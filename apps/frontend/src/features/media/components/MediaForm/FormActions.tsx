import { Grid, SimpleGrid, Button } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type FormActionsProps = {
  mode: "add" | "update";
  isPending: boolean;
  onCancel: () => void;
};

export function FormActions({
  mode,
  isPending,
  onCancel: handleCancel,
}: FormActionsProps) {
  return (
    <Grid.Col span={{ xs: 12 }}>
      <SimpleGrid
        cols={{ base: 1, xs: 2 }}
        spacing="md"
        w={{ base: "100%", xs: 320 }}
        ml="auto"
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
    </Grid.Col>
  );
}
