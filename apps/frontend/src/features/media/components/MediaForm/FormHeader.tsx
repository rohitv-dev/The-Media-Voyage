import type { ReactNode } from "react";
import { Box, Card, Checkbox, Flex, Grid, Group, Stack } from "@mantine/core";
import { IconMovie } from "@tabler/icons-react";
import { useFormContext } from "./context";
import { SectionHeading } from "#/components/SectionHeading";
import { TutorialTrigger } from "#/features/tutorials/components/TutorialTrigger";

type FormHeaderProps = {
  mode: "add" | "update";
  mobileActions?: ReactNode;
  onStartTutorial?: () => void;
};

export function FormHeader({
  mode,
  mobileActions,
  onStartTutorial,
}: FormHeaderProps) {
  const form = useFormContext();
  const isAddMode = mode === "add";

  return (
    <Grid.Col span={{ xs: 12 }}>
      <Card withBorder shadow="sm" p={{ base: "md", sm: "lg" }} h="100%">
        <Stack gap="sm">
          <Flex
            direction={{ base: "column", sm: "row" }}
            align={{ base: "stretch", sm: "center" }}
            justify="space-between"
            gap={{ base: "md", sm: "lg" }}
          >
            <Group gap="xs" wrap="nowrap">
              <SectionHeading
                icon={<IconMovie size={24} stroke={2} />}
                title={
                  isAddMode
                    ? "Add Media to Your Collection"
                    : "Update Media Details"
                }
                description={
                  isAddMode
                    ? "Track movies, shows, books, and games and keep notes on your journey"
                    : "Update your media entry and keep your collection current"
                }
              />
              {onStartTutorial && (
                <TutorialTrigger
                  label="Start media form tutorial"
                  onClick={onStartTutorial}
                />
              )}
            </Group>

            <Checkbox
              label="Mark as Favorite ⭐"
              {...form.getInputProps("favorite", {
                type: "checkbox",
              })}
            />
          </Flex>

          {mobileActions && (
            <Box
              hiddenFrom="sm"
              pt="sm"
              style={{
                borderTop: "1px solid var(--mantine-color-default-border)",
              }}
            >
              {mobileActions}
            </Box>
          )}
        </Stack>
      </Card>
    </Grid.Col>
  );
}
