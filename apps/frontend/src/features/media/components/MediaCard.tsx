import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Rating,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconDeviceGamepad2,
  IconMovie,
  IconBook,
  IconDeviceTv,
  IconHeartFilled,
} from "@tabler/icons-react";
import type { MediaRecord } from "@media-voyage/shared/api";
import dayjs from "dayjs";
import { motion } from "motion/react";

interface MediaCardProps {
  media: MediaRecord;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export function MediaCard({ media, onView, onEdit }: MediaCardProps) {
  const getTypeIcon = () => {
    switch (media.type) {
      case "movie":
        return <IconMovie size={18} />;
      case "show":
        return <IconDeviceTv size={18} />;
      case "game":
        return <IconDeviceGamepad2 size={18} />;
      case "book":
        return <IconBook size={18} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (media.status) {
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
      default:
        return "gray";
    }
  };

  return (
    <Card
      component={motion.div}
      withBorder
      h="100%"
      whileHover={{
        y: -4,
        scale: 1.015,
        boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
      }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 25,
      }}
      onClick={() => onView?.(media.id)}
      p={{ base: "sm", sm: "md" }}
    >
      <Box hiddenFrom="sm">
        <Stack gap={8}>
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              {getTypeIcon()}

              <Title order={5} lineClamp={1} fw={600}>
                {media.title}
              </Title>
            </Group>

            {media.favorite && (
              <IconHeartFilled size={17} color="red" aria-label="Favorite" />
            )}
          </Group>

          <Group justify="space-between" wrap="nowrap" gap="xs">
            <Group gap={6} wrap="nowrap">
              <Badge size="xs" variant="light">
                {media.type}
              </Badge>

              <Badge size="xs" color={getStatusColor()} variant="filled">
                {media.status.replaceAll("_", " ")}
              </Badge>
            </Group>

            <Button
              component={motion.button}
              size="compact-xs"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(media.id);
              }}
            >
              Edit
            </Button>
          </Group>

          <Group
            justify="space-between"
            align="flex-end"
            wrap="nowrap"
            gap="xs"
          >
            <Stack gap={2} style={{ minWidth: 0 }}>
              {media.rating != null && (
                <Rating
                  readOnly
                  size="xs"
                  value={media.rating / 2}
                  fractions={2}
                />
              )}

              {media.source && (
                <Text size="xs" truncate>
                  {media.source}
                </Text>
              )}
            </Stack>

            <Text size="xs" c="dimmed" ta="right" lh={1.25} miw="fit-content">
              Added{" "}
              {media.createdAt && dayjs(media.createdAt).format("MMM DD YYYY")}
              <br />
              Updated {dayjs(media.updatedAt).format("MMM DD, YYYY")}
            </Text>
          </Group>
        </Stack>
      </Box>

      <Box visibleFrom="sm" h="100%">
        <Stack justify="space-between" h="100%">
          <div>
            <Group justify="space-between" align="flex-start">
              <Group gap="xs">
                {getTypeIcon()}

                <Title order={5} lineClamp={2} fw={600}>
                  {media.title}
                </Title>
              </Group>

              {media.favorite && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                >
                  <IconHeartFilled size={20} color="red" />
                </motion.div>
              )}
            </Group>

            <Group mt="sm">
              <Badge variant="light">{media.type}</Badge>

              <Badge color={getStatusColor()} variant="filled">
                {media.status.replaceAll("_", " ")}
              </Badge>
            </Group>

            <Stack gap={4} mt="md">
              {media.rating != null && (
                <Rating readOnly value={media.rating / 2} fractions={2} />
              )}

              {media.source && <Text size="sm">{media.source}</Text>}

              <Text size="xs">
                Added{" "}
                {media.createdAt &&
                  dayjs(media.createdAt).format("MMM DD YYYY")}
              </Text>

              <Text size="xs" c="dimmed">
                Updated {dayjs(media.updatedAt).format("MMM DD, YYYY")}
              </Text>
            </Stack>
          </div>

          <Group>
            <Button
              component={motion.button}
              size="xs"
              whileHover={{
                width: 100,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(media.id);
              }}
            >
              Edit
            </Button>
          </Group>
        </Stack>
      </Box>
    </Card>
  );
}
