import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import type { NavLinkProps } from "@mantine/core";
import {
  useDisclosure,
  useHotkeys,
  useLocalStorage,
  useMediaQuery,
} from "@mantine/hooks";
import {
  IconBooks,
  IconBell,
  IconCalendar,
  IconChevronRight,
  IconDeviceTv,
  IconHelp,
  IconLayoutSidebar,
  IconLogout,
  IconPlus,
  IconSettings,
  IconTags,
  IconTrash,
  IconTrendingUp,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";
import { latestNotificationsQueryOptions } from "#/features/notifications/queries";
import { NotificationPopover } from "#/features/notifications/components/NotificationPopover";
import { useMarkNotificationsSeen } from "#/features/notifications/hooks/useMarkNotificationsSeen";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import { friendRequestsQueryOptions } from "#/features/friends/queries";
import { sessionQueryKey, sessionQueryOptions } from "#/auth/session";
import { authClient } from "#/auth/authClient";
import { ShortcutsHelpModal } from "#/components/ShortcutsHelpModal";
import { ThemeSwitcher } from "#/theme/ThemeSwitcher";

const SIDEBAR_ACTIVE_PILL_ID = "sidebar-active-pill";

interface SidebarNavLinkProps extends NavLinkProps {
  /** Rail mode: icon only, label shown in a tooltip instead. */
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

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);

    if (!session) {
      throw redirect({ to: "/auth/login" });
    }

    // Exposed to child routes so forms can read account preferences (e.g.
    // defaultVisibility) synchronously, without a session-loading flicker.
    return { session };
  },
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();

  const [
    navbarOpened,
    { toggle: toggleNavbar, close: closeNavbar },
  ] = useDisclosure();
  const [sidebarOpened, setSidebarOpened] = useLocalStorage<boolean>({
    key: "media-voyage-sidebar-opened",
    defaultValue: true,
  });
  const isDesktop = useMediaQuery("(min-width: 62em)");
  const railCollapsed = isDesktop && !sidebarOpened;

  const [shortcutsOpened, { open: openShortcuts, close: closeShortcuts }] =
    useDisclosure();
  const [
    notificationsOpened,
    { open: openNotifications, close: closeNotifications },
  ] = useDisclosure();

  const { data: collections } = useSuspenseQuery(collectionQueryOptions);
  const { data: friendRequests } = useQuery(friendRequestsQueryOptions);
  const {
    data: notificationData,
    isLoading: notificationsLoading,
    isError: notificationsError,
  } = useQuery(latestNotificationsQueryOptions);

  const pendingRequests = friendRequests?.incoming.length ?? 0;
  const unseenNotifications = notificationData?.unseenCount ?? 0;

  const markNotificationsSeenMutation = useMarkNotificationsSeen();

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

  const goTo = (to: Parameters<typeof navigate>[0]["to"]) => () => {
    navigate({ to });
    closeNavbar();
  };

  const markNotificationsSeen = () => {
    if (unseenNotifications > 0 && !markNotificationsSeenMutation.isPending) {
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

  const openNotificationsPage = () => {
    closeNotifications();
    navigate({ to: "/notifications" });
    closeNavbar();
  };

  const openNotification = (userMediaId: string | null) => {
    closeNotifications();

    if (userMediaId) {
      navigate({ to: "/media/view/$id", params: { id: userMediaId } });
      return;
    }

    navigate({ to: "/friends" });
  };

  useHotkeys([
    [
      "/",
      (event) => {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>('[data-shortcut="library-search"]')
          ?.focus();
      },
    ],
    ["c", () => navigate({ to: "/media/add" })],
    [
      "r",
      () =>
        document
          .querySelector<HTMLButtonElement>('[data-shortcut="reset-filters"]')
          ?.click(),
    ],
    [
      "?",
      (event) => {
        event.preventDefault();
        openShortcuts();
      },
    ],
  ]);

  const logout = async () => {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    navigate({ to: "/auth/login" });
  };

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{
        width: railCollapsed ? 76 : 260,
        breakpoint: "md",
        collapsed: { mobile: !navbarOpened },
      }}
    >
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
              onClick={toggleNavbar}
              hiddenFrom="md"
              size="sm"
              aria-label={
                navbarOpened ? "Close navigation" : "Open navigation"
              }
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
                aria-label={
                  sidebarOpened ? "Collapse sidebar" : "Expand sidebar"
                }
                onClick={() => setSidebarOpened((value) => !value)}
              >
                <IconLayoutSidebar size={18} />
              </ActionIcon>
            </Tooltip>

            <Box
              style={{ cursor: "pointer" }}
              onClick={() => navigate({ to: "/media" })}
            >
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
              onViewAll={openNotificationsPage}
            />

            <Box visibleFrom="sm">
              <Tooltip label="Keyboard shortcuts" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  aria-label="Keyboard shortcuts"
                  onClick={openShortcuts}
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
                  onClick={() => navigate({ to: "/media/add" })}
                >
                  <IconPlus size={20} />
                </ActionIcon>
              </Tooltip>
            </Box>
            <Button
              visibleFrom="md"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate({ to: "/media/add" })}
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
                  onClick={() => navigate({ to: "/profile" })}
                  aria-label="Open profile"
                >
                  <IconUser size={17} />
                </Avatar>
              </Tooltip>
            </Box>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p={0}
        style={{
          borderRight: "1px solid var(--mantine-color-default-border)",
          background: "var(--mantine-color-body)",
        }}
      >
        <Stack gap={0} p="sm" h="100%">
          <Stack gap={4}>
            <SidebarNavLink
              label="Dashboard"
              leftSection={<IconTrendingUp size={19} />}
              active={isActive("/dashboard")}
              onClick={goTo("/dashboard")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Library"
              leftSection={<IconBooks size={19} />}
              active={isActive("/media")}
              onClick={goTo("/media")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Activity Calendar"
              leftSection={<IconCalendar size={19} />}
              active={isActive("/calendar")}
              onClick={goTo("/calendar")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Friends"
              leftSection={<IconUsers size={19} />}
              rightSection={
                pendingRequests > 0 ? (
                  <Badge size="sm" circle>
                    {pendingRequests}
                  </Badge>
                ) : undefined
              }
              active={isActive("/friends")}
              onClick={goTo("/friends")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Notifications"
              leftSection={<IconBell size={19} />}
              rightSection={
                unseenNotifications > 0 ? (
                  <Badge size="sm" variant="filled" radius="xl">
                    {unseenNotifications > 99 ? "99+" : unseenNotifications}
                  </Badge>
                ) : undefined
              }
              active={isActive("/notifications")}
              onClick={openNotificationsPage}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Tag Management"
              leftSection={<IconTags size={19} />}
              active={isActive("/tags")}
              onClick={goTo("/tags")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Source Management"
              leftSection={<IconDeviceTv size={19} />}
              active={isActive("/sources")}
              onClick={goTo("/sources")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Trash"
              leftSection={<IconTrash size={19} />}
              active={isActive("/trash")}
              onClick={goTo("/trash")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Profile"
              leftSection={<IconUser size={19} />}
              active={isActive("/profile")}
              onClick={goTo("/profile")}
              collapsed={railCollapsed}
            />

            <SidebarNavLink
              label="Settings"
              leftSection={<IconSettings size={19} />}
              active={isActive("/settings")}
              onClick={goTo("/settings")}
              collapsed={railCollapsed}
            />

            <Divider my="md" />

            {!railCollapsed && (
              <Stack gap={4}>
                <SidebarNavLink
                  label="Collections"
                  active={isActive("/collection", true)}
                  rightSection={<IconChevronRight size={18} />}
                  onClick={goTo("/collection")}
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
                      onClick={() => {
                        navigate({
                          to: "/collection/view/$id",
                          params: { id: collection.id },
                        });
                        closeNavbar();
                      }}
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
                onClick={goTo("/media/add")}
              >
                Add Media
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconUser size={16} />}
                onClick={goTo("/profile")}
              >
                My profile
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconSettings size={16} />}
                onClick={goTo("/settings")}
              >
                Settings
              </Button>
              <Button
                variant="subtle"
                color="red"
                leftSection={<IconLogout size={16} />}
                onClick={logout}
              >
                Logout
              </Button>
            </Stack>
          </Box>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <ShortcutsHelpModal opened={shortcutsOpened} onClose={closeShortcuts} />
    </AppShell>
  );
}
