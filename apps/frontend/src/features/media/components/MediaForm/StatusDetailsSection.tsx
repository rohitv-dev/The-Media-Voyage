import { SectionHeading } from "#/components/SectionHeading";
import {
  Grid,
  Card,
  Stack,
  SimpleGrid,
  Select,
  NumberInput,
  Progress,
} from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { statusOptions } from "../../options";
import { useFormContext } from "./context";

export function StatusDetailsSection() {
  const form = useFormContext();

  return (
    <Grid.Col span={{ xs: 12, md: 5 }}>
      <Card withBorder shadow="sm" p={{ base: "md", md: "lg" }} h="100%">
        <Stack gap="md">
          <SectionHeading
            icon={<IconChartBar size={20} stroke={2} />}
            title="Status Details"
            description="State of the media you are tracking"
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Select
              label="Status"
              placeholder="Choose status"
              variant="filled"
              data={statusOptions}
              {...form.getInputProps("status")}
            />

            <NumberInput
              label="Rating"
              placeholder="8.5"
              variant="filled"
              inputMode="decimal"
              min={0}
              max={10}
              decimalScale={1}
              {...form.getInputProps("rating")}
            />
          </SimpleGrid>

          <Stack gap="xs">
            <NumberInput
              variant="filled"
              label="Progress"
              inputMode="numeric"
              min={0}
              max={100}
              step={5}
              {...form.getInputProps("progress")}
            />

            <Progress
              value={form.values.progress ?? 0}
              size="lg"
              radius="xl"
              color="teal"
            />
          </Stack>
        </Stack>
      </Card>
    </Grid.Col>
  );
}
