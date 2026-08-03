import type { NotificationRecord } from "@media-voyage/shared/api";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconHelp,
  IconLayoutSidebar,
  IconPlus,
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
      <Group justify="space-between" h="100%" px={{ base: "md", sm: "lg" }}>
        <Group gap="sm" wrap="nowrap">
          <Burger
            opened={navbarOpened}
            onClick={onToggleNavbar}
            hiddenFrom="md"
            size="sm"
            aria-label={navbarOpened ? "Close navigation" : "Open navigation"}
          />

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

          <Box style={{ cursor: "pointer" }} onClick={onGoHome}>
            <Group gap="sm" wrap="nowrap">
              <img
                src="/media-voyage-mark.svg"
                alt=""
                aria-hidden="true"
                width="32"
                height="32"
                style={{ display: "block" }}
              />
              <Stack gap={0}>
                <Title order={4} lh={1.1}>
                  Media Voyage
                </Title>
                <Text size="xs" c="dimmed" lh={1.2} visibleFrom="sm">
                  Your personal media log
                </Text>
              </Stack>
            </Group>
          </Box>
        </Group>

        <Group gap="sm" wrap="nowrap">
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
          <Box hiddenFrom="md">
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
