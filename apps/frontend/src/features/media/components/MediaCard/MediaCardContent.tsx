import {
  Badge,
  Group,
  Progress,
  Rating,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { IconClockPause, IconHeartFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { getStatusColor, getTypeIcon } from "../../display";
import { getStaleProgressDays } from "../../staleProgress";
import { useSourceColorMap } from "#/features/named-entities/queries";

interface MediaCardContentProps {
  media: MediaRecord;
  readOnly?: boolean;
  quickActions: ReactNode;
}

export function MediaCardContent({
  media,
  readOnly,
  quickActions,
}: MediaCardContentProps) {
  const sourceColorMap = useSourceColorMap();

  const staleProgressDays =
    media.status === "in_progress"
      ? getStaleProgressDays(media.lastProgressUpdate)
      : null;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          {getTypeIcon(media.type)}
          <Title order={5} lineClamp={2} fw={600}>
            {media.title}
          </Title>
        </Group>

        <Group gap={4} wrap="nowrap">
          {media.favorite && (
            <IconHeartFilled size={18} color="red" aria-label="Favorite" />
          )}
          {!readOnly && quickActions}
        </Group>
      </Group>

      <Group gap={6} wrap="wrap">
        <Badge size="sm" variant="light">
          {media.type}
        </Badge>
        <Badge size="sm" color={getStatusColor(media.status)} variant="filled">
          {media.status.replaceAll("_", " ")}
        </Badge>
      </Group>

      {(media.rating != null || media.source) && (
        <Stack gap={4}>
          {media.rating != null && (
            <Rating readOnly size="sm" value={media.rating / 2} fractions={2} />
          )}
          {media.source && (
            <Badge
              variant="dot"
              color={sourceColorMap.get(media.source) ?? "gray"}
              size="sm"
              style={{ alignSelf: "flex-start" }}
            >
              {media.source}
            </Badge>
          )}
        </Stack>
      )}

      {(media.status === "in_progress" || media.status === "on_hold") && (
        <Stack gap={6} mt={4}>
          <Group gap="xs" wrap="nowrap">
            <Progress value={media.progress ?? 0} flex={1} />
            <Text size="xs" c="dimmed" w={32} ta="right">
              {media.progress ?? 0}%
            </Text>
          </Group>
          {staleProgressDays !== null && (
            <Badge
              variant="light"
              size="sm"
              leftSection={<IconClockPause size={13} />}
              styles={{ root: { alignSelf: "flex-start" } }}
            >
              Resume? {staleProgressDays} days quiet
            </Badge>
          )}
        </Stack>
      )}
    </Stack>
  );
}
