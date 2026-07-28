import type {
  SeasonProgressEntry,
  UserMediaFormSchema,
} from "@media-voyage/shared/api";
import {
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { useFormContext } from "./context";

type CatalogMetadata = {
  runtime?: unknown;
};

type DurationParts = {
  hours: number;
  minutes: number;
};

type ShowSummary = {
  totalEpisodeCount: number;
  watchedEpisodeCount: number;
};

type TimeSpentModalProps = {
  catalogMetadata?: unknown;
};

function parseRuntimeMinutes(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return undefined;

  const runtime = (metadata as CatalogMetadata).runtime;
  if (typeof runtime !== "string") return undefined;

  const match = runtime.match(/(\d+(?:\.\d+)?)\s*(?:min|minutes)\b/i);
  if (!match) return undefined;

  const minutes = Math.round(Number(match[1]));
  return Number.isFinite(minutes) && minutes > 0 ? minutes : undefined;
}

function getShowSummary(seasonsProgress?: SeasonProgressEntry[]): ShowSummary {
  let totalEpisodeCount = 0;
  let watchedEpisodeCount = 0;

  for (const season of seasonsProgress ?? []) {
    const episodeCount = season.expectedEpisodeCount ?? 0;
    totalEpisodeCount += episodeCount;
    watchedEpisodeCount += season.episodesWatched ?? 0;
  }

  return {
    totalEpisodeCount,
    watchedEpisodeCount,
  };
}

export function getEstimatedTimeSpentMinutes(
  type: UserMediaFormSchema["type"],
  metadata: unknown,
  seasonsProgress?: SeasonProgressEntry[],
) {
  const runtimeMinutes = parseRuntimeMinutes(metadata);

  if (type === "movie") return runtimeMinutes;
  if (type !== "show") return undefined;
  if (!runtimeMinutes) return undefined;

  const watchedEpisodeCount = (seasonsProgress ?? []).reduce(
    (total, season) => total + (season.episodesWatched ?? 0),
    0,
  );
  const estimatedMinutes = watchedEpisodeCount * runtimeMinutes;

  return estimatedMinutes > 0 ? Math.round(estimatedMinutes) : undefined;
}

function minutesToDurationParts(totalMinutes: number): DurationParts {
  const normalizedMinutes = Math.max(0, Math.trunc(totalMinutes));
  return {
    hours: Math.floor(normalizedMinutes / 60),
    minutes: normalizedMinutes % 60,
  };
}

function durationPartsToMinutes(parts: DurationParts) {
  return (
    Math.max(0, Math.trunc(parts.hours)) * 60 +
    Math.max(0, Math.trunc(parts.minutes))
  );
}

export function formatDuration(totalMinutes: number) {
  const { hours, minutes } = minutesToDurationParts(totalMinutes);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function numberInputValue(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

export function TimeSpentModal({ catalogMetadata }: TimeSpentModalProps) {
  const form = useFormContext();
  const [opened, { open, close }] = useDisclosure(false);
  const [draft, setDraft] = useState<DurationParts>({
    hours: 0,
    minutes: 0,
  });

  const estimatedTimeSpentMinutes = getEstimatedTimeSpentMinutes(
    form.values.type,
    catalogMetadata,
    form.values.seasonsProgress,
  );
  const catalogRuntimeMinutes = parseRuntimeMinutes(catalogMetadata);
  const showSummary =
    form.values.type === "show"
      ? getShowSummary(form.values.seasonsProgress)
      : undefined;

  const openModal = () => {
    setDraft(minutesToDurationParts(Number(form.values.timeSpent) || 0));
    open();
  };

  const saveTimeSpent = () => {
    const totalMinutes = durationPartsToMinutes(draft);
    form.setFieldValue("timeSpent", totalMinutes || undefined);
    close();
  };

  const useEstimatedTime = () => {
    if (!estimatedTimeSpentMinutes) return;
    setDraft(minutesToDurationParts(estimatedTimeSpentMinutes));
  };

  return (
    <>
      <TextInput
        label="Time Spent"
        description="Approximate time spent"
        variant="filled"
        value={
          form.values.timeSpent
            ? formatDuration(Number(form.values.timeSpent))
            : "Not set"
        }
        readOnly
        pointer
        onClick={openModal}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openModal();
          }
        }}
        styles={{ input: { textAlign: "center" } }}
      />

      <Modal opened={opened} onClose={close} centered title="Time spent">
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
            <NumberInput
              label="Hours"
              variant="filled"
              min={0}
              allowDecimal={false}
              inputMode="numeric"
              value={draft.hours}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  hours: numberInputValue(value),
                }))
              }
            />
            <NumberInput
              label="Minutes"
              variant="filled"
              min={0}
              max={59}
              allowDecimal={false}
              inputMode="numeric"
              value={draft.minutes}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  minutes: numberInputValue(value),
                }))
              }
            />
          </SimpleGrid>

          <Card withBorder radius="sm" p="sm">
            <Stack gap="xs">
              <Group justify="space-between" gap="xs">
                <Text size="sm" fw={600}>
                  Catalog runtime
                </Text>
                <Text size="sm" c="dimmed">
                  {form.values.type === "show"
                    ? catalogRuntimeMinutes
                      ? `${formatDuration(catalogRuntimeMinutes)} avg episode`
                      : "Not available"
                    : catalogRuntimeMinutes
                      ? formatDuration(catalogRuntimeMinutes)
                      : "Not available"}
                </Text>
              </Group>

              {form.values.type === "show" && (
                <Text size="xs" c="dimmed">
                  {showSummary?.totalEpisodeCount ?? 0} episodes total
                </Text>
              )}

              {estimatedTimeSpentMinutes ? (
                <Group justify="space-between" align="center" gap="xs">
                  <Text size="xs" c="dimmed">
                    {form.values.type === "show"
                      ? `${showSummary?.watchedEpisodeCount ?? 0} episode${showSummary?.watchedEpisodeCount === 1 ? "" : "s"} watched · estimate ${formatDuration(estimatedTimeSpentMinutes)}`
                      : `Suggested total: ${formatDuration(estimatedTimeSpentMinutes)}`}
                  </Text>
                  <Button
                    type="button"
                    variant="light"
                    size="xs"
                    onClick={useEstimatedTime}
                  >
                    Use estimate
                  </Button>
                </Group>
              ) : (
                <Text size="xs" c="dimmed">
                  {form.values.type === "show" && catalogRuntimeMinutes
                    ? "Add episodes watched under Seasons to calculate an estimate."
                    : "Enter the total manually for this media type."}
                </Text>
              )}
            </Stack>
          </Card>

          <Group justify="flex-end" mt="sm">
            <Button type="button" variant="light" onClick={close}>
              Cancel
            </Button>
            <Button type="button" onClick={saveTimeSpent}>
              Save time
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
