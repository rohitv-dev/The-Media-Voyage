import { CollapsibleSectionHeading } from "#/components/CollapsibleSectionHeading";
import { Grid, Card, Stack, Collapse, Textarea } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { useFormContext } from "./context";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

export function PersonalNotesSection() {
  const form = useFormContext();
  const isMobile = useMediaQuery("(max-width: 47.99em)");
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Grid.Col span={{ xs: 12, md: 6 }}>
      <Card withBorder shadow="sm" p={{ base: "md", md: "lg" }} h="100%">
        <CollapsibleSectionHeading
          icon={<IconPencil size={20} stroke={2} />}
          title="Personal Notes"
          description="Capture your thoughts and observations"
          opened={opened}
          onToggle={toggle}
        />

        <Collapse expanded={!isMobile || opened}>
          <Stack gap="md" mt="md">
            <Textarea
              label="Review"
              placeholder="Share your thoughts about this media..."
              variant="filled"
              rows={6}
              description="Your thoughts and opinions"
              {...form.getInputProps("review")}
            />

            <Textarea
              label="Notes"
              placeholder="Private notes, memorable moments, recommendations..."
              variant="filled"
              rows={4}
              description="Private notes visible only to you"
              {...form.getInputProps("notes")}
            />
          </Stack>
        </Collapse>
      </Card>
    </Grid.Col>
  );
}
