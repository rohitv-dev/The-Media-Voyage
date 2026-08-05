import {
  Badge,
  Box,
  Card,
  Group,
  Image,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { IconPhotoOff } from "@tabler/icons-react";
import { motion } from "motion/react";
import type { KeyboardEvent } from "react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import { getStatusColor, getTypeIcon } from "../display";
import { getImageObjectPosition } from "../imageFocus";

interface ContinueMediaCardProps {
  media: MediaRecord;
  onView: (id: string) => void;
}

export function ContinueMediaCard({ media, onView }: ContinueMediaCardProps) {
  const reduceMotion = useAppReducedMotion();
  const [showCoverArt] = useCoverArtPreference();
  const hasImage = !!media.imageUrl && media.imageUrl !== "N/A";
  const progress = media.progress;

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
      p="xs"
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
      <Group gap="sm" wrap="nowrap" align="stretch">
        {showCoverArt && (
          <Box
            h={64}
            w={48}
            style={{
              borderRadius: "var(--mantine-radius-sm)",
              overflow: "hidden",
            }}
          >
            {hasImage ? (
              <Image
                src={media.imageUrl}
                alt=""
                h={64}
                w={48}
                fit="cover"
                style={{
                  objectPosition: getImageObjectPosition("full", media),
                }}
              />
            ) : (
              <Box
                h={64}
                w={48}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--mantine-color-accent-1)",
                }}
              >
                <IconPhotoOff
                  size={20}
                  style={{
                    color: "var(--mantine-color-accent-6)",
                    opacity: 0.6,
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        <Stack
          gap={6}
          style={{ flex: 1, justifyContent: "space-between", minWidth: 0 }}
        >
          <Group gap="xs" wrap="nowrap">
            {getTypeIcon(media.type)}
            <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
              {media.title}
            </Text>
          </Group>

          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Badge
              size="xs"
              color={getStatusColor(media.status)}
              variant="light"
            >
              {media.status.replaceAll("_", " ")}
            </Badge>
            <Text size="xs" c="dimmed">
              {progress}%
            </Text>
          </Group>

          <Progress value={progress} size="sm" />
        </Stack>
      </Group>
    </Card>
  );
}
