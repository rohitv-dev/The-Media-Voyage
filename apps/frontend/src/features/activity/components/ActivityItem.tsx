import type { ActivityRecord } from "@media-voyage/shared/api";
import {
  Box,
  Group,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import dayjs from "dayjs";

interface ActivityItemProps {
  activity: ActivityRecord;
  onClick?: () => void;
}

type ActivityChange = {
  from: unknown;
  to: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(
  details: Record<string, unknown>,
  key: string,
  fallback: string,
) {
  const value = details[key];
  return typeof value === "string" && value ? value : fallback;
}

function getChanges(details: Record<string, unknown>) {
  if (!isRecord(details.changes)) return [];

  return Object.entries(details.changes).flatMap(([field, value]) => {
    if (!isRecord(value) || !("from" in value) || !("to" in value)) {
      return [];
    }

    return [
      [field, { from: value.from, to: value.to } as ActivityChange] as const,
    ];
  });
}

function formatSeasonProgress(value: readonly unknown[]) {
  return (
    value
      .flatMap((entry) => {
        if (!isRecord(entry) || typeof entry.season !== "number") return [];

        const watched =
          typeof entry.episodesWatched === "number"
            ? entry.episodesWatched
            : undefined;
        const expected =
          typeof entry.expectedEpisodeCount === "number"
            ? entry.expectedEpisodeCount
            : undefined;
        const episodes =
          watched !== undefined
            ? `${watched}${expected !== undefined ? `/${expected}` : ""} episodes`
            : expected !== undefined
              ? `${expected} episodes`
              : "not started";

        return [`Season ${entry.season}: ${episodes}`];
      })
      .join(", ") || "none"
  );
}

function getSeasonProgressMap(value: unknown) {
  if (!Array.isArray(value)) return null;

  return new Map(
    value.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.season !== "number") return [];
      return [[entry.season, entry] as const];
    }),
  );
}

function formatSeasonProgressChange(from: unknown, to: unknown) {
  const fromBySeason = getSeasonProgressMap(from);
  const toBySeason = getSeasonProgressMap(to);

  if (!fromBySeason || !toBySeason) {
    return `${formatValue(from, "seasonsProgress")} → ${formatValue(to, "seasonsProgress")}`;
  }

  const seasons = [
    ...new Set([...fromBySeason.keys(), ...toBySeason.keys()]),
  ].sort((a, b) => a - b);

  return (
    seasons
      .flatMap((season) => {
        const before = fromBySeason.get(season);
        const after = toBySeason.get(season);
        const beforeComparable = before
          ? { ...before, updatedAt: undefined }
          : null;
        const afterComparable = after
          ? { ...after, updatedAt: undefined }
          : null;

        if (
          JSON.stringify(beforeComparable) === JSON.stringify(afterComparable)
        ) {
          return [];
        }

        return [
          `${before ? formatSeasonProgress([before]) : "none"} → ${after ? formatSeasonProgress([after]) : "none"}`,
        ];
      })
      .join(", ") || "none"
  );
}

function formatValue(value: unknown, field?: string) {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (field === "seasonsProgress" && Array.isArray(value)) {
    return formatSeasonProgress(value);
  }
  if (Array.isArray(value)) {
    return value.length
      ? value
          .map((item) =>
            typeof item === "string" ? item : JSON.stringify(item),
          )
          .join(", ")
      : "none";
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatField(field: string) {
  return field
    .replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getSummary(activity: ActivityRecord) {
  const { details } = activity;
  const mediaTitle = getText(details, "mediaTitle", "Media");

  switch (activity.type) {
    case "media_added":
      return `Added ${mediaTitle} to your library`;
    case "media_updated":
      return `Updated ${mediaTitle}`;
    case "media_trashed":
      return `Moved ${mediaTitle} to trash`;
    case "media_restored":
      return `Restored ${mediaTitle}`;
  }
}

export function ActivityItem({ activity, onClick }: ActivityItemProps) {
  const changes = getChanges(activity.details);
  const initialValues = isRecord(activity.details.initialValues)
    ? Object.entries(activity.details.initialValues)
    : [];

  const content = (
    <Group align="flex-start" gap="sm" wrap="nowrap">
      <ThemeIcon color="accent" variant="light" radius="xl" size={34}>
        <IconHistory size={17} />
      </ThemeIcon>

      <Stack gap={4} style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" fw={500} lh={1.35}>
          {getSummary(activity)}.
        </Text>

        {initialValues.length > 0 && (
          <Text size="xs" c="dimmed">
            Added with{" "}
            {initialValues
              .map(
                ([field, value]) =>
                  `${formatField(field)}: ${formatValue(value, field)}`,
              )
              .join(", ")}
          </Text>
        )}

        {changes.length > 0 && (
          <Stack gap={1}>
            {changes.map(([field, change]) => (
              <Text key={field} size="xs" c="dimmed">
                {formatField(field)}:{" "}
                {field === "seasonsProgress"
                  ? formatSeasonProgressChange(change.from, change.to)
                  : `${formatValue(change.from, field)} → ${formatValue(change.to, field)}`}
              </Text>
            ))}
          </Stack>
        )}

        <Text size="xs" c="dimmed">
          {dayjs(activity.createdAt).format("MMM D, YYYY · h:mm A")}
        </Text>
      </Stack>
    </Group>
  );

  if (!onClick) return <Box p="sm">{content}</Box>;

  return (
    <UnstyledButton
      w="100%"
      p="sm"
      onClick={onClick}
      style={{ borderRadius: "var(--mantine-radius-sm)", textAlign: "left" }}
    >
      {content}
    </UnstyledButton>
  );
}
