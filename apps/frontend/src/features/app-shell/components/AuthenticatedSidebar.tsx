import {
  AppShell,
  Badge,
  Box,
  Button,
  Divider,
  NavLink,
  Stack,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import type { NavLinkProps } from "@mantine/core";
import {
  IconBell,
  IconBooks,
  IconCalendar,
  IconChevronRight,
  IconDeviceTv,
  IconLogout,
  IconPlus,
  IconSettings,
  IconTags,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import { friendRequestsQueryOptions } from "#/features/friends/queries";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { latestNotificationsQueryOptions } from "#/features/notifications/queries";

const SIDEBAR_ACTIVE_PILL_ID = "sidebar-active-pill";

const navigationItems = [
  { label: "Dashboard", icon: IconTrendingUp, path: "/dashboard" },
  { label: "Library", icon: IconBooks, path: "/media" },
  { label: "Activity Calendar", icon: IconCalendar, path: "/calendar" },
  { label: "Friends", icon: IconUsers, path: "/friends" },
  { label: "Notifications", icon: IconBell, path: "/notifications" },
  { label: "Tag Management", icon: IconTags, path: "/tags" },
  { label: "Source Management", icon: IconDeviceTv, path: "/sources" },
  { label: "Trash", icon: IconTrash, path: "/trash" },
  { label: "Profile", icon: IconUser, path: "/profile" },
  { label: "Settings", icon: IconSettings, path: "/settings" },
] as const;

interface SidebarNavLinkProps extends NavLinkProps {
  collapsed?: boolean;
}

function SidebarNavLink({
  active,
  collapsed,
  label,
  leftSection,
  onClick,
  ...props
}: SidebarNavLinkProps) {
  const reduceMotion = useAppReducedMotion();

  if (collapsed) {
    return (
      <Tooltip label={label} position="right" withArrow>
        <UnstyledButton
          onClick={onClick}
          aria-label={typeof label === "string" ? label : undefined}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 40,
            borderRadius: "var(--mantine-radius-sm)",
            backgroundColor: active
              ? "var(--mantine-primary-color-light)"
              : "transparent",
          }}
        >
          {leftSection}
        </UnstyledButton>
      </Tooltip>
    );
  }

  return (
    <Box pos="relative">
      {active && (
        <motion.div
          layoutId={SIDEBAR_ACTIVE_PILL_ID}
          className={SIDEBAR_ACTIVE_PILL_ID}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 40 }
          }
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "var(--mantine-radius-sm)",
            backgroundColor: "var(--mantine-primary-color-light)",
          }}
        />
      )}
      <NavLink
        active={active}
        label={label}
        leftSection={leftSection}
        onClick={onClick}
        style={{ position: "relative", backgroundColor: "transparent" }}
        {...props}
      />
    </Box>
  );
}

interface AuthenticatedSidebarProps {
  railCollapsed: boolean;
  onNavigate: (path: string) => void;
  onNavigateToCollection: (collectionId: string) => void;
  onLogout: () => void;
}

export function AuthenticatedSidebar({
  railCollapsed,
  onNavigate,
  onNavigateToCollection,
  onLogout,
}: AuthenticatedSidebarProps) {
  const { pathname } = useLocation();
  const { data: collections } = useSuspenseQuery(collectionQueryOptions);
  const { data: friendRequests } = useQuery(friendRequestsQueryOptions);
  const { data: notificationData } = useQuery(latestNotificationsQueryOptions);
  const pendingRequests = friendRequests?.incoming.length ?? 0;
  const unseenNotifications = notificationData?.unseenCount ?? 0;
  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  return (
    <AppShell.Navbar
      p={0}
      style={{
        borderRight: "1px solid var(--mantine-color-default-border)",
        background: "var(--mantine-color-body)",
      }}
    >
      <Stack gap={0} p="sm" h="100%">
        <Stack gap={4}>
          {navigationItems.map(({ label, icon, path }) => {
            const Icon = icon;
            const rightSection =
              path === "/friends" && pendingRequests > 0 ? (
                <Badge size="sm" circle>
                  {pendingRequests}
                </Badge>
              ) : path === "/notifications" && unseenNotifications > 0 ? (
                <Badge size="sm" variant="filled" radius="xl">
                  {unseenNotifications > 99 ? "99+" : unseenNotifications}
                </Badge>
              ) : undefined;

            return (
              <SidebarNavLink
                key={path}
                label={label}
                leftSection={<Icon size={19} />}
                rightSection={rightSection}
                active={isActive(path)}
                onClick={() => onNavigate(path)}
                collapsed={railCollapsed}
              />
            );
          })}

          <Divider my="md" />

          {!railCollapsed && (
            <Stack gap={4}>
              <SidebarNavLink
                label="Collections"
                active={isActive("/collection", true)}
                rightSection={<IconChevronRight size={18} />}
                onClick={() => onNavigate("/collection")}
              />

              <Stack gap={4} pl="sm">
                {collections.map((collection) => (
                  <SidebarNavLink
                    key={collection.id}
                    label={collection.name}
                    description={
                      collection.description
                        ? String(collection.description)
                        : undefined
                    }
                    leftSection={<IconBooks size={16} />}
                    active={isActive(`/collection/view/${collection.id}`)}
                    onClick={() => onNavigateToCollection(collection.id)}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>

        <Box hiddenFrom="md" mt="auto">
          <Divider my="md" />
          <Stack gap="xs">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => onNavigate("/media/add")}
            >
              Add Media
            </Button>
            <Button
              variant="light"
              color="gray"
              leftSection={<IconUser size={16} />}
              onClick={() => onNavigate("/profile")}
            >
              My profile
            </Button>
            <Button
              variant="light"
              color="gray"
              leftSection={<IconSettings size={16} />}
              onClick={() => onNavigate("/settings")}
            >
              Settings
            </Button>
            <Button
              variant="subtle"
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={onLogout}
            >
              Logout
            </Button>
          </Stack>
        </Box>
      </Stack>
    </AppShell.Navbar>
  );
}
