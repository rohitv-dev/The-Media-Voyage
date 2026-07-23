import {
  Grid,
  Card,
  Flex,
  Checkbox,
} from "@mantine/core";
import { IconMovie } from "@tabler/icons-react";
import { useFormContext } from "./context";
import { SectionHeading } from "#/components/SectionHeading";

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
          <SectionHeading
            icon={<IconMovie size={24} stroke={2} />}
            title={isAddMode
              ? "Add Media to Your Collection"
              : "Update Media Details"}
            description={isAddMode
              ? "Track movies, shows, books, and games and keep notes on your journey"
              : "Update your media entry and keep your collection current"}
          />

          <Checkbox
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
