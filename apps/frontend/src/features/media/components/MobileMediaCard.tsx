import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import { useMediaCardActions } from "#/features/media/hooks/useMediaCardActions";
import {
  Badge,
  Box,
  Card,
  Flex,
  Group,
  Progress,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { IconHeartFilled } from "@tabler/icons-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { getStatusColor, getTypeIcon } from "../display";
import { MediaCoverArtFocusModal } from "./MediaCoverArtFocusModal";
import { MediaCardCoverArt } from "./MediaCard/MediaCardCoverArt";
import { MediaCardQuickActions } from "./MediaCard/MediaCardQuickActions";

interface MobileMediaCardProps {
  media: MediaRecord;
  onEdit?: (id: string) => void;
  onView?: (id: string) => void;
}

export function MobileMediaCard({
  media,
  onEdit,
  onView,
}: MobileMediaCardProps) {
  const [showCoverArt] = useCoverArtPreference();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const { isActionPending, requestDelete, runQuickAction } =
    useMediaCardActions(media);

  const openMedia = () => {
    if (!coverEditorOpen) onView?.(media.id);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMedia();
    }
  };

  return (
    <>
      <Card
        className="media-card"
        withBorder
        radius="lg"
        h={136}
        p="sm"
        role={onView ? "link" : undefined}
        tabIndex={onView ? 0 : undefined}
        onClick={openMedia}
        onKeyDown={handleKeyDown}
        style={{
          cursor: onView ? "pointer" : undefined,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Flex h="100%" gap="md" wrap="nowrap">
          {showCoverArt && (
            <Box
              h="100%"
              w={78}
              miw={78}
              style={{
                borderRadius: "var(--mantine-radius-sm)",
                overflow: "hidden",
              }}
            >
              <MediaCardCoverArt
                imageUrl={media.imageUrl}
                coverArtSize="full"
                imageFocusX={media.imageFocusX}
                imageFocusY={media.imageFocusY}
              />
            </Box>
          )}

          <Stack flex={1} gap="xs" style={{ minWidth: 0 }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Title order={5} lineClamp={2} fw={650} style={{ minWidth: 0 }}>
                {media.title}
              </Title>

              <Group gap={2} wrap="nowrap">
                {media.favorite && (
                  <IconHeartFilled
                    size={17}
                    color="red"
                    aria-label="Favorite"
                  />
                )}
                <MediaCardQuickActions
                  media={media}
                  isPending={isActionPending}
                  onAction={runQuickAction}
                  onDelete={requestDelete}
                  onEdit={onEdit ? () => onEdit(media.id) : undefined}
                  onEditCover={() => setCoverEditorOpen(true)}
                  actionSize="sm"
                />
              </Group>
            </Group>

            <Group gap={6} wrap="wrap">
              <Badge
                size="xs"
                variant="light"
                leftSection={getTypeIcon(media.type)}
              >
                {media.type}
              </Badge>
              <Badge
                size="xs"
                color={getStatusColor(media.status)}
                variant="filled"
              >
                {media.status.replaceAll("_", " ")}
              </Badge>
            </Group>

            <Stack gap={3} mt="auto">
              <Text size="xs" c="dimmed">
                {media.progress}%
              </Text>
              <Progress value={media.progress} size="sm" />
            </Stack>
          </Stack>
        </Flex>
      </Card>

      <MediaCoverArtFocusModal
        opened={coverEditorOpen}
        onClose={() => setCoverEditorOpen(false)}
        mediaId={media.id}
        title={media.title}
        imageUrl={media.imageUrl}
        imageFocusX={media.imageFocusX}
        imageFocusY={media.imageFocusY}
        coverArtSize="full"
      />
    </>
  );
}

export function MobileMediaCardSkeleton() {
  const [showCoverArt] = useCoverArtPreference();

  return (
    <Card withBorder radius="lg" h={136} p="sm" style={{ overflow: "hidden" }}>
      <Flex h="100%" gap="md" wrap="nowrap">
        {showCoverArt && (
          <Skeleton animate h="100%" w={78} miw={78} radius="sm" />
        )}
        <Stack flex={1} gap="xs">
          <Skeleton animate h={20} w="72%" />
          <Group gap="xs">
            <Skeleton animate h={18} w={64} radius="xl" />
            <Skeleton animate h={18} w={88} radius="xl" />
          </Group>
          <Stack gap={3} mt="auto">
            <Skeleton animate h={12} w={28} />
            <Skeleton animate h={8} />
          </Stack>
        </Stack>
      </Flex>
    </Card>
  );
}
