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
import type { CatalogMetadata } from "@media-voyage/shared";
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
  disabled?: boolean;
};

export function getCatalogRuntimeMinutes(metadata?: CatalogMetadata) {
  if (!metadata || !("runtime" in metadata)) return undefined;
  return metadata.runtime && metadata.runtime > 0
    ? metadata.runtime
    : undefined;
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
  const runtimeMinutes = getCatalogRuntimeMinutes(metadata);

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

export function TimeSpentModal({
  catalogMetadata,
  disabled = false,
}: TimeSpentModalProps) {
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
  const catalogRuntimeMinutes = getCatalogRuntimeMinutes(catalogMetadata);
  const showSummary =
    form.values.type === "show"
      ? getShowSummary(form.values.seasonsProgress)
      : undefined;

  if (form.values.type === "show" && catalogRuntimeMinutes) {
    return (
      <TextInput
        label="Time Spent"
        description={`${showSummary?.watchedEpisodeCount ?? 0} watched × ${catalogRuntimeMinutes} min average`}
        variant="filled"
        value={
          form.values.timeSpent
            ? formatDuration(Number(form.values.timeSpent))
            : "No episodes watched"
        }
        disabled={disabled}
        readOnly
        styles={{ input: { textAlign: "center" } }}
      />
    );
  }

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
        disabled={disabled}
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
                  {catalogRuntimeMinutes
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
                    Suggested total: {formatDuration(estimatedTimeSpentMinutes)}
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
                  Enter the total manually for this media type.
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
