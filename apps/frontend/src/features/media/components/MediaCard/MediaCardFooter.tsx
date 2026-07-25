import { Button, Group, Text } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import type { ReactNode } from "react";

interface MediaCardFooterProps {
  media: MediaRecord;
  readOnly?: boolean;
  onEdit?: (id: string) => void;
  footerRight?: ReactNode;
  isActionPending: boolean;
  isDeletePending: boolean;
  onDelete: () => void;
}

export function MediaCardFooter({
  media,
  readOnly,
  onEdit,
  footerRight,
  isActionPending,
  isDeletePending,
  onDelete,
}: MediaCardFooterProps) {
  return (
    <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xs">
      <Text size="xs" c="dimmed" lh={1.4}>
        Added {dayjs(media.createdAt).format("MMM DD, YYYY")}
        <br />
        Updated {dayjs(media.updatedAt).format("MMM DD, YYYY")}
      </Text>

      {footerRight ??
        (!readOnly && (
          <Group gap="xs" wrap="nowrap">
            {onEdit && (
              <Button
                size="xs"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(media.id);
                }}
              >
                Edit
              </Button>
            )}
            <Button
              size="xs"
              variant="subtle"
              color="red"
              leftSection={<IconTrash size={14} />}
              loading={isDeletePending}
              disabled={isActionPending}
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
            >
              Delete
            </Button>
          </Group>
        ))}
    </Group>
  );
}
