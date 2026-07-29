import type { NotificationListResponse } from "@media-voyage/shared/api";
import { IconBell, IconBellOff } from "@tabler/icons-react";
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Indicator,
  Loader,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { NotificationItem } from "./NotificationItem";

interface NotificationPopoverProps {
  opened: boolean;
  data: NotificationListResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  onChange: (opened: boolean) => void;
  onOpenNotification: (userMediaId: string | null) => void;
  onViewAll: () => void;
}

export function NotificationPopover({
  opened,
  data,
  isLoading,
  isError,
  onChange,
  onOpenNotification,
  onViewAll,
}: NotificationPopoverProps) {
  const unseenCount = data?.unseenCount ?? 0;

  return (
    <Popover
      opened={opened}
      onChange={onChange}
      position="bottom-end"
      width="min(360px, calc(100vw - 24px))"
      shadow="md"
      withinPortal
    >
      <Indicator
        color="red"
        size={8}
        offset={5}
        disabled={unseenCount === 0}
      >
        <Popover.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Notifications"
            onClick={() => onChange(!opened)}
          >
            <IconBell size={19} />
          </ActionIcon>
        </Popover.Target>
      </Indicator>

      <Popover.Dropdown p={0}>
        <Group justify="space-between" px="md" py="sm">
          <Text fw={600}>Notifications</Text>
          {unseenCount > 0 && (
            <Badge size="sm" variant="light" radius="xl">
              {unseenCount} new
            </Badge>
          )}
        </Group>
        <Divider />

        {isLoading ? (
          <Center h={120}>
            <Loader size="sm" />
          </Center>
        ) : isError ? (
          <Center h={120} px="md">
            <Text size="sm" c="dimmed" ta="center">
              Notifications could not be loaded.
            </Text>
          </Center>
        ) : data?.data.length ? (
          <Stack gap={0} p={4}>
            {data.data.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() =>
                  onOpenNotification(notification.userMediaId)
                }
              />
            ))}
          </Stack>
        ) : (
          <Center h={140}>
            <Stack gap="xs" align="center">
              <IconBellOff
                size={26}
                color="var(--mantine-color-dimmed)"
              />
              <Text size="sm" c="dimmed">
                No notifications yet.
              </Text>
            </Stack>
          </Center>
        )}

        <Divider />
        <Button
          variant="subtle"
          fullWidth
          radius={0}
          onClick={onViewAll}
        >
          View all notifications
        </Button>
      </Popover.Dropdown>
    </Popover>
  );
}
