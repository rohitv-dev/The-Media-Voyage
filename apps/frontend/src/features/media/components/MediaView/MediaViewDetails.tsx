import { capitalizeWords } from "#/utils/strings";
import { Badge, Box, Group, Paper, SimpleGrid, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useSourceColorMap } from "#/features/named-entities/queries";
import { accentText, defaultBorder } from "./constants";
import type { MediaViewData } from "./index";
import { formatDate, getProgress } from "./utils";

const formatValue = (value?: string | number | null) =>
  value === undefined || value === null || value === "" ? "—" : value;

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box p="md" style={{ borderTop: `1px solid ${defaultBorder}` }}>
      <Text
        size="xs"
        c="dimmed"
        fw={700}
        tt="uppercase"
        mb={5}
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </Text>
      <Text component="div" size="sm" fw={600} lh={1.35}>
        {value}
      </Text>
    </Box>
  );
}

export function MediaViewDetails({ data }: { data: MediaViewData }) {
  const sourceColorMap = useSourceColorMap();
  const progress = getProgress(data.progress);
  const catalogMetadata = data.catalogMetadata ?? undefined;

  const metaItems = [
    { label: "Status", value: capitalizeWords(data.status) },
    { label: "Rating", value: formatValue(data.rating?.toFixed(1)) },
    {
      label: "Source",
      value: data.source ? (
        <Badge
          variant="dot"
          color={sourceColorMap.get(data.source) ?? "gray"}
          size="sm"
        >
          {data.source}
        </Badge>
      ) : (
        "—"
      ),
    },
    { label: "Started", value: formatDate(data.startedAt) },
    { label: "Completed", value: formatDate(data.completedAt) },
    ...(catalogMetadata?.genre
      ? [{ label: "Genre", value: catalogMetadata.genre }]
      : []),
    ...(catalogMetadata?.catalogRating
      ? [{ label: "Catalog Rating", value: catalogMetadata.catalogRating }]
      : []),
  ];

  return (
    <Paper
      withBorder
      p="xs"
      style={{
        overflow: "hidden",
        borderColor: defaultBorder,
      }}
    >
      <Group justify="space-between" px="md" py="sm">
        <Text size="sm" fw={800} style={{ color: accentText }}>
          Details
        </Text>
        <Text size="xs" c="dimmed">
          {progress}% tracked
        </Text>
      </Group>
      <SimpleGrid cols={{ base: 2, xs: 3, sm: metaItems.length }} spacing={0}>
        {metaItems.map((item) => (
          <MetaItem key={item.label} label={item.label} value={item.value} />
        ))}
      </SimpleGrid>
    </Paper>
  );
}
