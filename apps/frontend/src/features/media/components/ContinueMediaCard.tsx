import {
  AspectRatio,
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
  const hasCoverArt = showCoverArt;
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
      {hasCoverArt && (
        <Card.Section>
          <AspectRatio ratio={2 / 3}>
            {hasImage ? (
              <Image
                src={media.imageUrl}
                alt=""
                fit="cover"
                style={{
                  objectPosition: getImageObjectPosition("full", media),
                }}
              />
            ) : (
              <Box
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--mantine-color-accent-1)",
                }}
              >
                <IconPhotoOff
                  size={24}
                  style={{
                    color: "var(--mantine-color-accent-6)",
                    opacity: 0.6,
                  }}
                />
              </Box>
            )}
          </AspectRatio>
        </Card.Section>
      )}

      <Stack gap={8} mt={hasCoverArt ? "sm" : 0}>
        <Stack gap={6}>
          <Group gap="xs">
            {getTypeIcon(media.type)}
            <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
              {media.title}
            </Text>
          </Group>
          <Badge size="xs" color={getStatusColor(media.status)} variant="light">
            {media.status.replaceAll("_", " ")}
          </Badge>
        </Stack>

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
