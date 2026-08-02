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
import type { CatalogMetadata } from "../../catalogMetadata";
import { formatDuration } from "../../formatDuration";

type DurationParts = {
  hours: number;
  minutes: number;
};

type ShowSummary = {
  totalEpisodeCount: number;
  watchedEpisodeCount: number;
};

type TimeSpentModalProps = {
  catalogMetadata?: CatalogMetadata;
};

function parseRuntimeMinutes(metadata?: CatalogMetadata<"movie" | "show">) {
  const runtime = metadata?.runtime;
  if (!runtime) return undefined;

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
  metadata?: CatalogMetadata,
  seasonsProgress: SeasonProgressEntry[] = [],
) {
  const runtimeMinutes = parseRuntimeMinutes(metadata);

  if (type === "movie") {
    return runtimeMinutes;
  }

  if (type !== "show" || !runtimeMinutes) {
    return undefined;
  }

  const totalEpisodesWatched = seasonsProgress.reduce(
    (total, season) => total + (season.episodesWatched ?? 0),
    0,
  );

  if (totalEpisodesWatched === 0) {
    return undefined;
  }

  return Math.round(totalEpisodesWatched * runtimeMinutes);
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
