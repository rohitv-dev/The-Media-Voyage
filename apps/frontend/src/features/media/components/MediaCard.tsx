import {
  Badge,
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
} from "@tabler/icons-react";
import type { MediaRecord } from "@media-voyage/shared/api";
import dayjs from "dayjs";

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
      withBorder
      h="100%"
      style={{
        cursor: "pointer",
      }}
      onClick={() => onView?.(media.id)}
    >
      <Stack justify="space-between" h="100%">
        <div>
          <Group justify="space-between" align="flex-start">
            <Group gap="xs">
              {getTypeIcon()}

              <Title order={4} lineClamp={2}>
                {media.title}
              </Title>
            </Group>

            {media.favorite && <Rating size="md" value={1} count={1} />}
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
              {media.createdAt && dayjs(media.createdAt).format("MMM DD YYYY")}
            </Text>
          </Stack>
        </div>

        <Group>
          <Button
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(media.id);
            }}
          >
            Edit
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
