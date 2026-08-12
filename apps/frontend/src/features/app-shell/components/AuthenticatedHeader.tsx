import type { NotificationRecord } from "@media-voyage/shared/api";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  Kbd,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconHelp,
  IconLayoutSidebar,
  IconPlus,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { NotificationPopover } from "#/features/notifications/components/NotificationPopover";
import { latestNotificationsQueryOptions } from "#/features/notifications/queries";
import { useMarkNotificationsSeen } from "#/features/notifications/hooks/useMarkNotificationsSeen";
import { openRecommendationModal } from "#/features/recommendations/components/ContextModal";
import { ThemeSwitcher } from "#/theme/ThemeSwitcher";

interface AuthenticatedHeaderProps {
  navbarOpened: boolean;
  sidebarOpened: boolean;
  onToggleNavbar: () => void;
  onToggleSidebar: () => void;
  onGoHome: () => void;
  onOpenNotificationsPage: () => void;
  onOpenMedia: (userMediaId: string) => void;
  onOpenFriends: () => void;
  onOpenShortcuts: () => void;
  onOpenCommandPalette: () => void;
  onAddMedia: () => void;
  onOpenProfile: () => void;
}

export function AuthenticatedHeader({
  navbarOpened,
  sidebarOpened,
  onToggleNavbar,
  onToggleSidebar,
  onGoHome,
  onOpenNotificationsPage,
  onOpenMedia,
  onOpenFriends,
  onOpenShortcuts,
  onOpenCommandPalette,
  onAddMedia,
  onOpenProfile,
}: AuthenticatedHeaderProps) {
  const [
    notificationsOpened,
    { open: openNotifications, close: closeNotifications },
  ] = useDisclosure();
  const {
    data: notificationData,
    isLoading: notificationsLoading,
    isError: notificationsError,
  } = useQuery(latestNotificationsQueryOptions);
  const markNotificationsSeenMutation = useMarkNotificationsSeen();

  const markNotificationsSeen = () => {
    if (
      (notificationData?.unseenCount ?? 0) > 0 &&
      !markNotificationsSeenMutation.isPending
    ) {
      markNotificationsSeenMutation.mutate();
    }
  };

  const handleNotificationsChange = (nextOpened: boolean) => {
    if (nextOpened) {
      openNotifications();
      markNotificationsSeen();
    } else {
      closeNotifications();
    }
  };

  const openNotification = (notification: NotificationRecord) => {
    closeNotifications();

    if (notification.recommendationId) {
      openRecommendationModal(notification.recommendationId);
    } else if (notification.userMediaId) {
      onOpenMedia(notification.userMediaId);
    } else {
      onOpenFriends();
    }
  };

  const viewAllNotifications = () => {
    closeNotifications();
    onOpenNotificationsPage();
  };

  return (
    <AppShell.Header
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
        background: "var(--mantine-color-body)",
      }}
    >
      <Group
        justify="space-between"
        h="100%"
        px={{ base: "sm", sm: "lg" }}
        gap="xs"
        wrap="nowrap"
      >
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Box visibleFrom="sm" hiddenFrom="md">
            <Burger
              opened={navbarOpened}
              onClick={onToggleNavbar}
              size="sm"
              aria-label={navbarOpened ? "Close navigation" : "Open navigation"}
            />
          </Box>

          <Tooltip
            label={sidebarOpened ? "Collapse sidebar" : "Expand sidebar"}
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              visibleFrom="md"
              aria-label={sidebarOpened ? "Collapse sidebar" : "Expand sidebar"}
              onClick={onToggleSidebar}
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>
          </Tooltip>

          <Box style={{ cursor: "pointer", minWidth: 0 }} onClick={onGoHome}>
            <Group gap="xs" wrap="nowrap" miw={0}>
              <img
                src="/media-voyage-mark.svg"
                alt=""
                aria-hidden="true"
                width="32"
                height="32"
                style={{ display: "block" }}
              />
              <Stack gap={0} miw={0}>
                <Title
                  order={4}
                  fz={{ base: "lg", sm: "h4" }}
                  lh={1.1}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Media Voyage
                </Title>
                <Text size="xs" c="dimmed" lh={1.2} visibleFrom="sm">
                  Your personal media log
                </Text>
              </Stack>
            </Group>
          </Box>
        </Group>

        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Box visibleFrom="lg">
            <Button
              variant="default"
              size="sm"
              leftSection={<IconSearch size={16} />}
              rightSection={<Kbd size="xs">Ctrl K</Kbd>}
              onClick={onOpenCommandPalette}
            >
              Search or jump
            </Button>
          </Box>
          <Box hiddenFrom="lg">
            <Tooltip label="Search or jump" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Open command palette"
                onClick={onOpenCommandPalette}
              >
                <IconSearch size={19} />
              </ActionIcon>
            </Tooltip>
          </Box>

          <NotificationPopover
            opened={notificationsOpened}
            data={notificationData}
            isLoading={notificationsLoading}
            isError={notificationsError}
            onChange={handleNotificationsChange}
            onOpenNotification={openNotification}
            onViewAll={viewAllNotifications}
          />

          <Box visibleFrom="sm">
            <Tooltip label="Keyboard shortcuts" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Keyboard shortcuts"
                onClick={onOpenShortcuts}
              >
                <IconHelp size={18} />
              </ActionIcon>
            </Tooltip>
          </Box>
          <Box visibleFrom="sm">
            <ThemeSwitcher />
          </Box>
          <Box visibleFrom="sm" hiddenFrom="md">
            <Tooltip label="Add media" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Add media"
                onClick={onAddMedia}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>
          </Box>
          <Button
            visibleFrom="md"
            size="sm"
            leftSection={<IconPlus size={16} />}
            onClick={onAddMedia}
          >
            Add Media
          </Button>
          <Box visibleFrom="md">
            <Tooltip label="Profile" withArrow>
              <Avatar
                color="accent"
                radius="xl"
                size="sm"
                style={{ cursor: "pointer" }}
                onClick={onOpenProfile}
                aria-label="Open profile"
              >
                <IconUser size={17} />
              </Avatar>
            </Tooltip>
          </Box>
        </Group>
      </Group>
    </AppShell.Header>
  );
}
