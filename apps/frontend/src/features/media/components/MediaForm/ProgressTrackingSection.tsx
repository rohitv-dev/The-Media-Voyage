import { CollapsibleSectionHeading } from "#/components/CollapsibleSectionHeading";
import {
  Grid,
  Card,
  Stack,
  SimpleGrid,
  NumberInput,
  Collapse,
  Autocomplete,
  TagsInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconClipboard } from "@tabler/icons-react";
import type { UserMediaDropdowns } from "@media-voyage/shared/api";
import { useFormContext } from "./context";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

type ProgressTrackingSectionProps = {
  dropdowns: UserMediaDropdowns;
};

export function ProgressTrackingSection({
  dropdowns,
}: ProgressTrackingSectionProps) {
  const form = useFormContext();
  const isMobile = useMediaQuery("(max-width: 47.99em)");
  const isCompleted = form.values.status === "completed";
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Grid.Col span={{ xs: 12, md: 6 }}>
      <Card withBorder shadow="sm" p="lg">
        <CollapsibleSectionHeading
          icon={<IconClipboard size={20} stroke={2} />}
          title="Progress & Tracking"
          description="Keep track of progress, ratings, and completion dates"
          opened={opened}
          onToggle={toggle}
        />

        <Collapse expanded={!isMobile || opened}>
          <Stack gap="md" mt="md">
            <SimpleGrid
              cols={{ base: 1, sm: isCompleted ? 2 : 1 }}
              spacing="md"
            >
              <DateInput
                label="Started At"
                placeholder="Select date"
                variant="filled"
                clearable
                {...form.getInputProps("startedAt")}
              />

              {isCompleted && (
                <DateInput
                  label="Completed At"
                  placeholder="Select date"
                  variant="filled"
                  clearable
                  {...form.getInputProps("completedAt")}
                />
              )}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label="Time Spent"
                placeholder="120"
                variant="filled"
                inputMode="numeric"
                min={0}
                suffix=" min"
                description="Approximate time spent"
                {...form.getInputProps("timeSpent")}
              />

              <NumberInput
                label="Rewatches"
                placeholder="0"
                variant="filled"
                inputMode="numeric"
                min={0}
                description="Number of revisits"
                {...form.getInputProps("rewatches")}
              />
            </SimpleGrid>

            <Autocomplete
              label="Source"
              placeholder="Netflix, Steam, Kindle..."
              variant="filled"
              description="Where you consumed it"
              data={dropdowns.sources}
              {...form.getInputProps("source")}
            />

            <TagsInput
              label="Tags"
              placeholder="Science Fiction, Horror..."
              variant="filled"
              data={dropdowns.tags}
              clearable
              description="Press Enter or comma to add a tag"
              {...form.getInputProps("tags")}
            />
          </Stack>
        </Collapse>
      </Card>
    </Grid.Col>
  );
}
