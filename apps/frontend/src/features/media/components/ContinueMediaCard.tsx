import { Badge, Card, Group, Progress, Stack, Text } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { motion, useReducedMotion } from "motion/react";
import type { KeyboardEvent } from "react";
import { getStatusColor, getTypeIcon } from "../functions";

interface ContinueMediaCardProps {
  media: MediaRecord;
  onView: (id: string) => void;
}

export function ContinueMediaCard({ media, onView }: ContinueMediaCardProps) {
  const reduceMotion = useReducedMotion();
  const progress = media.progress ?? 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onView(media.id);
    }
  };

  return (
    <Card
      component={motion.div}
      withBorder
      p="sm"
      role="link"
      tabIndex={0}
      aria-label={`Resume ${media.title}`}
      whileHover={
        reduceMotion
          ? undefined
          : { y: -3, boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }
      }
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={() => onView(media.id)}
      onKeyDown={handleKeyDown}
      style={{ cursor: "pointer" }}
    >
      <Stack gap={8}>
        <Group gap={6} wrap="nowrap">
          {getTypeIcon(media.type)}
          <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
            {media.title}
          </Text>
          <Badge
            size="xs"
            color={getStatusColor(media.status)}
            variant="light"
          >
            {media.status.replaceAll("_", " ")}
          </Badge>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Progress value={progress} flex={1} size="sm" />
          <Text size="xs" c="dimmed" w={30} ta="right">
            {progress}%
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
