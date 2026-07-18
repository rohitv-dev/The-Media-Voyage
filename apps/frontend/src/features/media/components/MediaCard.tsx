import { api } from "#/lib/api";
import { showErrorNotification } from "#/utils/notifications";
import { getStaleProgressDays } from "#/features/media/staleProgress";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Progress,
  Rating,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type {
  MediaRecord,
  UserMediaQuickAction,
} from "@media-voyage/shared/api";
import type { Status } from "@media-voyage/shared/userMediaSchema";
import {
  IconBook,
  IconCheck,
  IconDeviceGamepad2,
  IconDeviceTv,
  IconDotsVertical,
  IconHeart,
  IconHeartFilled,
  IconMovie,
  IconClockPause,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

interface MediaCardProps {
  media: MediaRecord;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

const statuses: Array<{ value: Status; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
  { value: "revisiting", label: "Revisiting" },
  { value: "dropped", label: "Dropped" },
];

function getStatusColor(status: Status) {
  switch (status) {
    case "completed":
      return "green";
    case "in_progress":
      return "blue";
    case "planned":
      return "orange";
    case "dropped":
      return "red";
    case "on_hold":
      return "yellow";
    case "revisiting":
      return "violet";
  }
}

export function MediaCard({ media, onView, onEdit }: MediaCardProps) {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const [displayMedia, setDisplayMedia] = useState(media);
  const staleProgressDays =
    displayMedia.status === "in_progress"
      ? getStaleProgressDays(displayMedia.lastProgressUpdate)
      : null;

  useEffect(() => setDisplayMedia(media), [media]);

  const quickActionMutation = useMutation({
    mutationFn: (action: UserMediaQuickAction) =>
      api<MediaRecord>(`/user-media/${media.id}/quick-actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      }),
    onSuccess: setDisplayMedia,
    onError: (error) =>
      showErrorNotification({
        title: "Quick action failed",
        message: error.message,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-media"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const getTypeIcon = () => {
    switch (displayMedia.type) {
      case "movie":
        return <IconMovie size={18} />;
      case "show":
        return <IconDeviceTv size={18} />;
      case "game":
        return <IconDeviceGamepad2 size={18} />;
      case "book":
        return <IconBook size={18} />;
    }
  };

  const runQuickAction = (action: UserMediaQuickAction) => {
    quickActionMutation.mutate(action);
  };

  const openMedia = () => onView?.(displayMedia.id);

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMedia();
    }
  };

  const renderQuickActionsMenu = () => (
    <Menu position="bottom-end" shadow="md" width={210} withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`Quick actions for ${displayMedia.title}`}
          loading={quickActionMutation.isPending}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDotsVertical size={17} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
        <Menu.Label>Quick actions</Menu.Label>
        <Menu.Item
          leftSection={
            displayMedia.favorite ? (
              <IconHeartFilled size={16} color="var(--mantine-color-red-6)" />
            ) : (
              <IconHeart size={16} />
            )
          }
          onClick={() => runQuickAction({ favorite: !displayMedia.favorite })}
        >
          {displayMedia.favorite ? "Remove favorite" : "Add to favorites"}
        </Menu.Item>

        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item>Change status</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {statuses.map((status) => (
              <Menu.Item
                key={status.value}
                color={getStatusColor(status.value)}
                rightSection={
                  displayMedia.status === status.value ? (
                    <IconCheck size={15} />
                  ) : undefined
                }
                onClick={() => runQuickAction({ status: status.value })}
              >
                {status.label}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>

        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item>
              Progress · {displayMedia.progress ?? 0}%
            </Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {[0, 25, 50, 75, 100].map((progress) => (
              <Menu.Item
                key={progress}
                rightSection={
                  displayMedia.progress === progress ? (
                    <IconCheck size={15} />
                  ) : undefined
                }
                onClick={() => runQuickAction({ progress })}
              >
                Set to {progress}%
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>
      </Menu.Dropdown>
    </Menu>
  );

  return (
    <Card
      component={motion.div}
      withBorder
      h="100%"
      role={onView ? "link" : undefined}
      tabIndex={onView ? 0 : undefined}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -4,
              boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
            }
      }
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={openMedia}
      onKeyDown={handleCardKeyDown}
      p={{ base: "sm", sm: "md" }}
      style={{ cursor: onView ? "pointer" : undefined }}
    >
      <Stack justify="space-between" h="100%" gap="sm">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
              {getTypeIcon()}
              <Title order={5} lineClamp={2} fw={600}>
                {displayMedia.title}
              </Title>
            </Group>

            <Group gap={4} wrap="nowrap">
              {displayMedia.favorite && (
                <IconHeartFilled size={18} color="red" aria-label="Favorite" />
              )}
              {renderQuickActionsMenu()}
            </Group>
          </Group>

          <Group gap={6} wrap="wrap">
            <Badge size="sm" variant="light">
              {displayMedia.type}
            </Badge>
            <Badge
              size="sm"
              color={getStatusColor(displayMedia.status)}
              variant="filled"
            >
              {displayMedia.status.replaceAll("_", " ")}
            </Badge>
          </Group>

          {(displayMedia.rating != null || displayMedia.source) && (
            <Stack gap={4}>
              {displayMedia.rating != null && (
                <Rating
                  readOnly
                  size="sm"
                  value={displayMedia.rating / 2}
                  fractions={2}
                />
              )}
              {displayMedia.source && (
                <Text size="sm" truncate>
                  {displayMedia.source}
                </Text>
              )}
            </Stack>
          )}

          {(displayMedia.status === "in_progress" ||
            displayMedia.status === "on_hold") && (
            <Stack gap={6} mt={4}>
              <Group gap="xs" wrap="nowrap">
                <Progress value={displayMedia.progress ?? 0} flex={1} />
                <Text size="xs" c="dimmed" w={32} ta="right">
                  {displayMedia.progress ?? 0}%
                </Text>
              </Group>
              {staleProgressDays !== null && (
                <Badge
                  color="orange"
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

        <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xs">
          <Text size="xs" c="dimmed" lh={1.4}>
            Added {dayjs(displayMedia.createdAt).format("MMM DD, YYYY")}
            <br />
            Updated {dayjs(displayMedia.updatedAt).format("MMM DD, YYYY")}
          </Text>

          <Button
            size="xs"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(displayMedia.id);
            }}
          >
            Edit
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
