import {
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import type { MantineColor } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import {
  IconChevronRight,
  IconLogout,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import { Fragment } from "react";
import type { ComponentType, ReactNode } from "react";
import { friendRequestsQueryOptions } from "#/features/friends/queries";
import { latestNotificationsQueryOptions } from "#/features/notifications/queries";
import { appNavigationItems } from "#/features/app-shell/navigation";
import type {
  AppNavigationPath,
  AppShellPath,
} from "#/features/app-shell/navigation";

const getNavigationItem = (path: AppNavigationPath) => {
  const item = appNavigationItems.find((candidate) => candidate.path === path);
  if (!item) throw new Error(`Missing navigation item for ${path}`);
  return item;
};

const browseItems = [
  getNavigationItem("/collection"),
  getNavigationItem("/friends"),
  getNavigationItem("/calendar"),
  getNavigationItem("/notifications"),
];

const manageItems = [
  getNavigationItem("/tags"),
  getNavigationItem("/sources"),
  getNavigationItem("/trash"),
];

const mobileLabels: Partial<Record<AppNavigationPath, string>> = {
  "/calendar": "Calendar",
  "/sources": "Sources",
  "/tags": "Tags",
};

interface MobileDrawerLinkProps {
  active?: boolean;
  color?: MantineColor;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  onClick: () => void;
  rightSection?: ReactNode;
}

function MobileDrawerLink({
  active,
  color,
  icon: Icon,
  label,
  onClick,
  rightSection,
}: MobileDrawerLinkProps) {
  return (
    <UnstyledButton
      aria-current={active ? "page" : undefined}
      c={color ?? (active ? "accent" : undefined)}
      h={48}
      px="sm"
      onClick={onClick}
      style={{
        borderRadius: "var(--mantine-radius-sm)",
        backgroundColor: active
          ? "var(--mantine-primary-color-light)"
          : "transparent",
      }}
    >
      <Group h="100%" gap="sm" wrap="nowrap">
        <Icon size={21} stroke={1.8} />
        <Text flex={1} c="inherit" fw={active ? 700 : 500}>
          {label}
        </Text>
        {rightSection}
        <IconChevronRight size={17} stroke={1.8} />
      </Group>
    </UnstyledButton>
  );
}

interface MobileMoreDrawerProps {
  opened: boolean;
  pathname: string;
  userName: string;
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (path: AppShellPath) => void;
}

export function MobileMoreDrawer({
  opened,
  pathname,
  userName,
  onClose,
  onLogout,
  onNavigate,
}: MobileMoreDrawerProps) {
  const { data: friendRequests } = useQuery(friendRequestsQueryOptions);
  const { data: notificationData } = useQuery(latestNotificationsQueryOptions);
  const pendingRequests = friendRequests?.incoming.length ?? 0;
  const unseenNotifications = notificationData?.unseenCount ?? 0;
  const drawerBottomOffset = "calc(72px + env(safe-area-inset-bottom))";
  const isActive = (path: string) => pathname.startsWith(path);

  const getBadge = (path: AppNavigationPath) => {
    const count =
      path === "/friends"
        ? pendingRequests
        : path === "/notifications"
          ? unseenNotifications
          : 0;

    return count > 0 ? (
      <Badge size="sm" circle={count < 10} radius="xl">
        {count > 99 ? "99+" : count}
      </Badge>
    ) : undefined;
  };

  const renderSection = (
    label: string,
    items: typeof browseItems | typeof manageItems,
  ) => (
    <Stack gap="xs">
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm">
        {label}
      </Text>
      <Paper withBorder radius="lg" p={4}>
        <Stack gap={0}>
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <Fragment key={item.path}>
                <MobileDrawerLink
                  active={isActive(item.path)}
                  icon={Icon}
                  label={mobileLabels[item.path] ?? item.label}
                  rightSection={getBadge(item.path)}
                  onClick={() => onNavigate(item.path)}
                />
                {index < items.length - 1 && <Divider mx="sm" />}
              </Fragment>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="left"
      size="78%"
      radius="xl"
      zIndex={250}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0 }}
      styles={{
        inner: {
          top: 76,
          bottom: drawerBottomOffset,
          height: "auto",
        },
        content: {
          borderTopRightRadius: "var(--mantine-radius-xl)",
          borderBottomRightRadius: "var(--mantine-radius-xl)",
          background: "var(--mantine-color-body)",
          boxShadow: "var(--mantine-shadow-lg)",
          overflow: "hidden",
        },
        body: { height: "100%", padding: 0 },
      }}
    >
      <Stack component="nav" aria-label="More navigation" gap={0} h="100%">
        <Paper withBorder radius="lg" p="sm" m="sm" mb="md">
          <Group gap="sm" wrap="nowrap">
            <Avatar name={userName} color="accent" size={48} radius="xl" />
            <Stack gap={1} miw={0}>
              <Text fw={700} lineClamp={1}>
                {userName}
              </Text>
              <Text size="sm" c="dimmed">
                Your account
              </Text>
            </Stack>
          </Group>
        </Paper>

        <ScrollArea flex={1} mih={0} px="sm" pb="sm" type="auto">
          <Stack gap="lg">
            {renderSection("Browse", browseItems)}
            {renderSection("Manage", manageItems)}
          </Stack>
        </ScrollArea>

        <Box p="sm" pt="xs">
          <Paper withBorder radius="lg" p={4}>
            <Stack gap={0}>
              <MobileDrawerLink
                active={isActive("/profile")}
                icon={IconUser}
                label="Profile"
                onClick={() => onNavigate("/profile")}
              />
              <Divider mx="sm" />
              <MobileDrawerLink
                active={isActive("/settings")}
                icon={IconSettings}
                label="Settings"
                onClick={() => onNavigate("/settings")}
              />
              <Divider mx="sm" />
              <MobileDrawerLink
                color="red"
                icon={IconLogout}
                label="Log out"
                onClick={onLogout}
              />
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Drawer>
  );
}
