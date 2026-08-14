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
import { getStatusOptions } from "../../options";
import { useFormContext } from "./context";

type StatusDetailsSectionProps = {
  isCatalogPending?: boolean;
};

export function StatusDetailsSection({
  isCatalogPending = false,
}: StatusDetailsSectionProps) {
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
              data={getStatusOptions(form.values.type)}
              disabled={isCatalogPending}
              {...form.getInputProps("status")}
            />

            <NumberInput
              label="Rating"
              placeholder="8"
              variant="filled"
              inputMode="numeric"
              min={0}
              max={10}
              step={1}
              allowDecimal={false}
              {...form.getInputProps("rating")}
            />
          </SimpleGrid>

          <Stack gap="xs">
            <NumberInput
              variant="filled"
              label="Progress"
              inputMode="numeric"
              placeholder="0 to 100"
              min={0}
              max={100}
              step={5}
              disabled={isCatalogPending}
              {...form.getInputProps("progress")}
            />

            <Progress value={form.values.progress ?? 0} size="lg" radius="xl" />
          </Stack>
        </Stack>
      </Card>
    </Grid.Col>
  );
}
