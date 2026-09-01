import { Button, Group, Text } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import dayjs from "dayjs";
import type { ReactNode } from "react";

interface MediaCardFooterProps {
  media: Omit<MediaRecord, "visibility">;
  onEdit?: (id: string) => void;
  footerRight?: ReactNode;
}

export function MediaCardFooter({
  media,
  onEdit,
  footerRight,
}: MediaCardFooterProps) {
  return (
    <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xs">
      <Text size="xs" c="dimmed" lh={1.4}>
        Added {dayjs(media.createdAt).format("MMM DD, YYYY")}
        <br />
        Updated {dayjs(media.updatedAt).format("MMM DD, YYYY")}
      </Text>

      {footerRight ??
        (onEdit && (
          <Button
            size="xs"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit(media.id);
            }}
          >
            Edit
          </Button>
        ))}
    </Group>
  );
}
