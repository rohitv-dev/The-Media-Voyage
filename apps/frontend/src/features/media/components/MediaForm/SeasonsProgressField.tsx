import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import type { SeasonProgressEntry } from "@media-voyage/shared/api";
import { statusOptions } from "../../options";
import { useFormContext } from "./context";

export function SeasonsProgressField() {
  const form = useFormContext();
  const [opened, { open, close }] = useDisclosure(false);
  const seasons = form.values.seasonsProgress ?? [];
  const sorted = [...seasons].sort((a, b) => a.season - b.season);

  const updateSeason = (
    target: SeasonProgressEntry,
    updates: Partial<SeasonProgressEntry>,
  ) => {
    form.setFieldValue("seasonsProgress", (prev = []) =>
      prev.map((entry) =>
        entry === target
          ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  };

  const removeSeason = (target: SeasonProgressEntry) => {
    form.setFieldValue("seasonsProgress", (prev = []) =>
      prev.filter((entry) => entry !== target),
    );
  };

  const addSeason = () => {
    form.setFieldValue("seasonsProgress", (prev = []) => [
      ...prev,
      {
        season: Math.max(0, ...prev.map((entry) => entry.season)) + 1,
        status: "planned",
        updatedAt: new Date().toISOString(),
      } satisfies SeasonProgressEntry,
    ]);
  };

  return (
    <>
      <Group justify="space-between">
        <Stack gap={0}>
          <Text size="sm" fw={600}>
            Seasons
          </Text>
          <Text size="xs" c="dimmed">
            {seasons.length
              ? `${seasons.length} season${seasons.length === 1 ? "" : "s"} tracked`
              : "No seasons added yet"}
          </Text>
        </Stack>
        <Button variant="light" size="xs" onClick={open}>
          Manage Seasons
        </Button>
      </Group>

      <Modal
        opened={opened}
        onClose={close}
        title="Seasons"
        size="lg"
      >
        <Stack gap="sm">
          <Group justify="flex-end">
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPlus size={14} />}
              onClick={addSeason}
            >
              Add season
            </Button>
          </Group>

          {sorted.length === 0 && (
            <Text size="sm" c="dimmed">
              No seasons added yet. Use "Add season" to start tracking.
            </Text>
          )}

          {sorted.map((entry, index) => (
            <Card key={`${entry.season}-${index}`} withBorder radius="sm" p="sm">
              <Stack gap="xs">
                <Group wrap="wrap" align="flex-end" gap="xs">
                  <NumberInput
                    label="Season"
                    variant="filled"
                    w={80}
                    min={1}
                    value={entry.season}
                    onChange={(value) =>
                      updateSeason(entry, {
                        season: typeof value === "number" ? value : entry.season,
                      })
                    }
                  />

                  <Select
                    label="Status"
                    variant="filled"
                    flex={1}
                    miw={140}
                    data={statusOptions}
                    value={entry.status}
                    onChange={(value) =>
                      value &&
                      updateSeason(entry, {
                        status: value,
                      })
                    }
                  />

                  <NumberInput
                    label="Episodes"
                    placeholder="Episodes"
                    variant="filled"
                    w={110}
                    min={0}
                    value={entry.episodesWatched}
                    onChange={(value) =>
                      updateSeason(entry, {
                        episodesWatched:
                          typeof value === "number" ? value : undefined,
                      })
                    }
                  />

                  <NumberInput
                    label="Rating"
                    placeholder="8.5"
                    variant="filled"
                    w={90}
                    inputMode="decimal"
                    min={0}
                    max={10}
                    decimalScale={1}
                    value={entry.rating}
                    onChange={(value) =>
                      updateSeason(entry, {
                        rating: typeof value === "number" ? value : undefined,
                      })
                    }
                  />

                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => removeSeason(entry)}
                    aria-label={`Remove season ${entry.season}`}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>

                <Textarea
                  label="Notes"
                  placeholder="Thoughts about this season..."
                  variant="filled"
                  rows={2}
                  value={entry.notes ?? ""}
                  onChange={(event) =>
                    updateSeason(entry, { notes: event.currentTarget.value })
                  }
                />

                <Text size="xs" c="dimmed">
                  Updated {dayjs(entry.updatedAt).format("DD/MM/YYYY")}
                </Text>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Modal>
    </>
  );
}
