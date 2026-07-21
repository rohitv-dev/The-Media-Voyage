import {
  Grid,
  Card,
  Flex,
  Group,
  Stack,
  Title,
  Checkbox,
  Text,
} from "@mantine/core";
import { IconMovie } from "@tabler/icons-react";
import { useFormContext } from "./context";

type FormHeaderProps = {
  mode: "add" | "update";
};

export function FormHeader({ mode }: FormHeaderProps) {
  const form = useFormContext();
  const isAddMode = mode === "add";

  return (
    <Grid.Col span={{ xs: 12 }}>
      <Card withBorder shadow="sm" p={{ base: "md", sm: "lg" }} h="100%">
        <Flex
          direction={{ base: "column", sm: "row" }}
          align={{ base: "stretch", sm: "center" }}
          justify="space-between"
          gap={{ base: "md", sm: "lg" }}
        >
          <Group align="center" gap="md" wrap="nowrap">
            <IconMovie size={32} stroke={1.5} style={{ flexShrink: 0 }} />
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Title order={2} fz={{ base: 24, sm: 30 }} lh={1.2}>
                {isAddMode
                  ? "Add Media to Your Collection"
                  : "Update Media Details"}
              </Title>
              <Text c="dimmed" size="xs">
                {isAddMode
                  ? "Track movies, shows, books, and games and keep notes on your journey"
                  : "Update your media entry and keep your collection current"}
              </Text>
            </Stack>
          </Group>

          <Checkbox
            w={{ base: "100%", sm: "auto" }}
            label="Mark as Favorite ⭐"
            {...form.getInputProps("favorite", {
              type: "checkbox",
            })}
          />
        </Flex>
      </Card>
    </Grid.Col>
  );
}
