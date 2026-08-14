import { ActionIcon, Menu } from "@mantine/core";
import type { ActionIconProps } from "@mantine/core";
import type {
  MediaRecord,
  UserMediaQuickAction,
} from "@media-voyage/shared/api";
import { visibilityEnumValues } from "@media-voyage/shared/userMediaSchema";
import type { Status } from "@media-voyage/shared/userMediaSchema";
import {
  IconCheck,
  IconDotsVertical,
  IconPhotoEdit,
  IconHeart,
  IconHeartFilled,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { getStatusColor } from "../../display";
import { capitalizeWords } from "#/utils/strings";

interface MediaCardQuickActionsProps {
  media: MediaRecord;
  isPending: boolean;
  onAction: (action: UserMediaQuickAction) => void;
  onDelete: () => void;
  onEdit?: () => void;
  onEditCover: () => void;
  actionSize?: ActionIconProps["size"];
}

const statuses: Array<{ value: Status; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On hold" },
  { value: "revisiting", label: "Revisiting" },
  { value: "dropped", label: "Dropped" },
];

export function MediaCardQuickActions({
  media,
  isPending,
  onAction,
  onDelete,
  onEdit,
  onEditCover,
  actionSize = "sm",
}: MediaCardQuickActionsProps) {
  const activeVisibility = media.visibility;

  return (
    <Menu position="bottom-end" shadow="md" width={210} withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size={actionSize}
          aria-label={`Quick actions for ${media.title}`}
          loading={isPending}
          disabled={isPending}
          onClick={(event) => event.stopPropagation()}
        >
          <IconDotsVertical size={17} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown onClick={(event) => event.stopPropagation()}>
        <Menu.Label>Quick actions</Menu.Label>
        <Menu.Item
          leftSection={
            media.favorite ? (
              <IconHeartFilled size={16} color="red" />
            ) : (
              <IconHeart size={16} />
            )
          }
          disabled={isPending}
          onClick={() => onAction({ favorite: !media.favorite })}
        >
          {media.favorite ? "Remove favorite" : "Add to favorites"}
        </Menu.Item>

        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item disabled={isPending}>Change status</Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {statuses.map((status) => (
              <Menu.Item
                key={status.value}
                color={getStatusColor(status.value)}
                rightSection={
                  media.status === status.value ? (
                    <IconCheck size={15} />
                  ) : undefined
                }
                onClick={() => onAction({ status: status.value })}
                disabled={isPending}
              >
                {status.label}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>

        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item disabled={isPending}>
              Toggle Visibility
            </Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {[...visibilityEnumValues].reverse().map((visibility) => (
              <Menu.Item
                key={visibility}
                rightSection={
                  activeVisibility === visibility ? (
                    <IconCheck size={15} />
                  ) : undefined
                }
                onClick={() => onAction({ visibility })}
                disabled={isPending}
              >
                {capitalizeWords(visibility)}
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>

        <Menu.Sub>
          <Menu.Sub.Target>
            <Menu.Sub.Item disabled={isPending}>
              Progress · {media.progress}%
            </Menu.Sub.Item>
          </Menu.Sub.Target>
          <Menu.Sub.Dropdown>
            {[0, 25, 50, 75, 100].map((progress) => (
              <Menu.Item
                key={progress}
                rightSection={
                  media.progress === progress ? (
                    <IconCheck size={15} />
                  ) : undefined
                }
                onClick={() => onAction({ progress })}
                disabled={isPending}
              >
                Set to {progress}%
              </Menu.Item>
            ))}
          </Menu.Sub.Dropdown>
        </Menu.Sub>

        {onEdit && (
          <Menu.Item
            leftSection={<IconPencil size={16} />}
            disabled={isPending}
            onClick={onEdit}
          >
            Edit details
          </Menu.Item>
        )}

        <Menu.Item
          leftSection={<IconPhotoEdit size={16} />}
          disabled={isPending || !media.imageUrl}
          onClick={(event) => {
            event.stopPropagation();
            onEditCover();
          }}
        >
          Adjust cover crop
        </Menu.Item>

        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          disabled={isPending}
          onClick={onDelete}
        >
          Delete
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
