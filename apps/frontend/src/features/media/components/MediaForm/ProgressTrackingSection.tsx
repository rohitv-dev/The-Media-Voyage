import { CollapsibleSectionHeading } from "#/components/CollapsibleSectionHeading";
import { PHONE_WIDTH_QUERY } from "#/theme/breakpoints";
import {
  Grid,
  Card,
  Stack,
  SimpleGrid,
  NumberInput,
  Collapse,
  Autocomplete,
  TagsInput,
  Button,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconChevronDown, IconClipboard } from "@tabler/icons-react";
import type { UserMediaDropdowns } from "@media-voyage/shared/api";
import { useFormContext } from "./context";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { SeasonsProgressField } from "./SeasonsProgressField";
import { TimeSpentModal } from "./TimeSpentModal";
import { getBookPageCount } from "./formUtils";

type ProgressTrackingSectionProps = {
  dropdowns: UserMediaDropdowns;
  isCatalogPending?: boolean;
  canSyncSeasons?: boolean;
  onSyncSeasons?: () => void;
};

export function ProgressTrackingSection({
  dropdowns,
  isCatalogPending = false,
  canSyncSeasons = false,
  onSyncSeasons,
}: ProgressTrackingSectionProps) {
  const form = useFormContext();
  const isMobile = useMediaQuery(PHONE_WIDTH_QUERY);
  const isCompleted = form.values.status === "completed";
  const isShow = form.values.type === "show";
  const numberOfPages = getBookPageCount(form.values.metadata ?? undefined);
  const [opened, { toggle }] = useDisclosure(false);
  const [dateAddedOpened, { toggle: toggleDateAdded }] = useDisclosure(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Grid.Col span={{ xs: 12, md: 6 }}>
      <Card withBorder shadow="sm" p={{ base: "md", md: "lg" }}>
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

            <SimpleGrid
              cols={{ base: 1, sm: form.values.type === "book" ? 2 : 1 }}
              spacing="md"
            >
              <TimeSpentModal disabled={isCatalogPending} />

              {form.values.type === "book" && (
                <NumberInput
                  label="Pages read"
                  placeholder="0"
                  variant="filled"
                  inputMode="numeric"
                  min={0}
                  max={numberOfPages}
                  allowDecimal={false}
                  description={
                    numberOfPages
                      ? `Out of ${numberOfPages.toLocaleString()} pages`
                      : "Total page count unavailable"
                  }
                  disabled={isCatalogPending}
                  {...form.getInputProps("pagesRead")}
                />
              )}
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

            {isShow && (
              <SeasonsProgressField
                isLoading={isCatalogPending}
                canSync={canSyncSeasons}
                onSync={onSyncSeasons}
              />
            )}

            <Button
              variant="default"
              size="xs"
              rightSection={
                <IconChevronDown
                  size={14}
                  style={{
                    transform: dateAddedOpened ? "rotate(180deg)" : undefined,
                  }}
                />
              }
              style={{ alignSelf: "flex-start" }}
              aria-expanded={dateAddedOpened}
              aria-controls="date-added-field"
              onClick={toggleDateAdded}
            >
              Adjust Date Added
            </Button>
            <Collapse expanded={dateAddedOpened} id="date-added-field">
              <DateInput
                label="Date Added"
                description="Used for additions analytics and date-added sorting."
                variant="filled"
                maxDate={today}
                value={
                  form.values.createdAt
                    ? new Date(form.values.createdAt).toISOString().slice(0, 10)
                    : today
                }
                onChange={(value) => {
                  if (value) {
                    // Keep the selected calendar date consistent with analytics.
                    form.setFieldValue(
                      "createdAt",
                      new Date(`${value}T00:00:00Z`),
                    );
                  }
                }}
              />
            </Collapse>
          </Stack>
        </Collapse>
      </Card>
    </Grid.Col>
  );
}
