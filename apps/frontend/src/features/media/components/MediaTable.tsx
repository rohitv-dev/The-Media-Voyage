import { capitalizeWords } from "#/utils/stringFunctions";
import autoAnimate from "@formkit/auto-animate";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Paper,
  Progress,
  Rating,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import {
  IconCheck,
  IconEdit,
  IconHeartFilled,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useReducedMotion } from "motion/react";
import { useCallback, useRef } from "react";
import { DataTable } from "mantine-datatable";
import { getStatusColor, getTypeIcon } from "../functions";

type MediaTableProps = {
  data: MediaRecord[];
};

function formatDate(value: Date | null | undefined) {
  return value ? dayjs(value).format("MMM D, YYYY") : "—";
}

function MediaIdentity({ record }: { record: MediaRecord }) {
  return (
    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
      <ThemeIcon variant="light" color="gray" size={36} radius="sm">
        {getTypeIcon(record.type)}
      </ThemeIcon>

      <Stack gap={3} style={{ minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text fw={650} truncate>
            {record.title}
          </Text>
          {record.favorite && (
            <IconHeartFilled
              size={15}
              color="var(--mantine-color-red-6)"
              aria-label="Favorite"
            />
          )}
        </Group>

        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Badge size="xs" variant="light" color="gray">
            {capitalizeWords(record.type)}
          </Badge>
          {record.source && (
            <Text size="xs" c="dimmed" truncate>
              {record.source}
            </Text>
          )}
        </Group>
      </Stack>
    </Group>
  );
}

function ProgressCell({ record }: { record: MediaRecord }) {
  const progress = Math.min(100, Math.max(0, record.progress ?? 0));

  if (record.status === "completed") {
    return (
      <Group gap={6} wrap="nowrap">
        <ThemeIcon size={22} radius="xl" color="green" variant="light">
          <IconCheck size={14} stroke={2.5} />
        </ThemeIcon>
        <Text size="sm" fw={600}>
          Complete
        </Text>
      </Group>
    );
  }

  if (record.status !== "in_progress" && record.status !== "on_hold") {
    return (
      <Text size="sm" c="dimmed">
        Not started
      </Text>
    );
  }

  return (
    <Stack gap={4} miw={120}>
      <Group gap={6} wrap="nowrap">
        <Progress value={progress} size="sm" radius="xl" flex={1} />
        <Text size="xs" c="dimmed" fw={700} w={34} ta="right">
          {progress}%
        </Text>
      </Group>
      <Text size="xs" c="dimmed">
        {capitalizeWords(record.status)}
      </Text>
    </Stack>
  );
}

export function MediaTable({ data }: MediaTableProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const autoAnimateInitialized = useRef(false);

  const bodyRef = useCallback(
    (node: HTMLTableSectionElement | null) => {
      if (node && !reduceMotion && !autoAnimateInitialized.current) {
        autoAnimate(node, { duration: 180 });
        autoAnimateInitialized.current = true;
      }
    },
    [reduceMotion],
  );

  return (
    <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
      <DataTable
        bodyRef={bodyRef}
        records={data}
        idAccessor="id"
        minHeight={data.length === 0 ? 180 : undefined}
        mah={650}
        verticalAlign="center"
        horizontalSpacing="md"
        withTableBorder
        borderRadius={0}
        textSelectionDisabled
        withRowBorders
        highlightOnHover
        striped
        noRecordsText="No media in this view"
        rowStyle={() => ({ cursor: "pointer" })}
        columns={[
          {
            accessor: "title",
            title: "Media",
            width: "36%",
            ellipsis: true,
            render: (record) => <MediaIdentity record={record} />,
          },
          {
            accessor: "status",
            title: "Status",
            width: 140,
            render: (record) => (
              <Badge
                color={getStatusColor(record.status)}
                variant="light"
                size="sm"
              >
                {capitalizeWords(record.status)}
              </Badge>
            ),
          },
          {
            accessor: "progress",
            title: "Progress",
            width: 170,
            render: (record) => <ProgressCell record={record} />,
          },
          {
            accessor: "rating",
            title: "Rating",
            width: 125,
            visibleMediaQuery: "(min-width: 48em)",
            render: (record) =>
              record.rating != null ? (
                <Group gap={6} wrap="nowrap">
                  <Rating
                    readOnly
                    size="xs"
                    value={record.rating / 2}
                    fractions={2}
                  />
                  <Text size="xs" c="dimmed" fw={700}>
                    {record.rating.toFixed(1)}
                  </Text>
                </Group>
              ) : (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              ),
          },
          {
            accessor: "updatedAt",
            title: "Updated",
            width: 130,
            visibleMediaQuery: "(min-width: 62em)",
            render: (record) => (
              <Stack gap={2}>
                <Text size="sm">{formatDate(record.updatedAt)}</Text>
                <Text size="xs" c="dimmed">
                  Added {formatDate(record.createdAt)}
                </Text>
              </Stack>
            ),
          },
          {
            accessor: "actions",
            title: "",
            width: 52,
            textAlign: "right",
            render: (record) => (
              <Tooltip label={`Update ${record.title}`} withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  aria-label={`Update ${record.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate({
                      to: "/media/update/$id",
                      params: { id: record.id },
                    });
                  }}
                >
                  <IconEdit size={17} />
                </ActionIcon>
              </Tooltip>
            ),
          },
        ]}
        onRowClick={({ record }) =>
          navigate({ to: "/media/view/$id", params: { id: record.id } })
        }
      />
      {data.length > 0 && (
        <Box
          px="md"
          py="xs"
          style={{
            borderTop: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Text size="xs" c="dimmed">
            {data.length} {data.length === 1 ? "entry" : "entries"} · Select a
            row to view details
          </Text>
        </Box>
      )}
    </Paper>
  );
}
