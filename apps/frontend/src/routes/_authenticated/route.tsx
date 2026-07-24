import {
  ActionIcon,
  AppShell,
  Avatar,
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
} from "@mantine/core";
import type { NavLinkProps } from "@mantine/core";
import { useDisclosure, useHotkeys } from "@mantine/hooks";
import {
  IconBooks,
  IconCalendar,
  IconChevronRight,
  IconDeviceTv,
  IconHelp,
  IconLogout,
  IconPlus,
  IconTags,
  IconTrendingUp,
  IconUser,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import { getSession } from "#/auth/session";
import { authClient } from "#/auth/authClient";
import { ShortcutsHelpModal } from "#/components/ShortcutsHelpModal";
import { ThemeSwitcher, ThemeOptionsList } from "#/theme/ThemeSwitcher";

const SIDEBAR_ACTIVE_PILL_ID = "sidebar-active-pill";

function SidebarNavLink({ active, ...props }: NavLinkProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Box pos="relative">
      {active && (
        <motion.div
          layoutId={SIDEBAR_ACTIVE_PILL_ID}
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
        style={{ position: "relative", backgroundColor: "transparent" }}
        {...props}
      />
    </Box>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getSession();

    if (!session) {
      throw redirect({ to: "/auth/login" });
    }
  },
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const [opened, { toggle, close }] = useDisclosure();
  const [shortcutsOpened, { open: openShortcuts, close: closeShortcuts }] =
    useDisclosure();
  const { data: collections } = useSuspenseQuery(collectionQueryOptions);
  const { pathname } = useLocation();

  const isActive = (path: string, exact = false) =>
    exact ? pathname === path : pathname.startsWith(path);

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
          .querySelector<HTMLButtonElement>(
            '[data-shortcut="reset-filters"]',
          )
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
    navigate({ to: "/auth/login" });
  };

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{
        width: 260,
        breakpoint: "md",
        collapsed: { mobile: !opened },
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
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
              aria-label={opened ? "Close navigation" : "Open navigation"}
            />

            <Box
              style={{ cursor: "pointer" }}
              onClick={() => navigate({ to: "/media" })}
            >
              <Stack gap={0}>
                <Title order={4} lh={1.1}>
                  Media Voyage
                </Title>
                <Text size="xs" c="dimmed" lh={1.2} visibleFrom="sm">
                  Your personal media log
                </Text>
              </Stack>
            </Box>
          </Group>

          <Group gap="md" wrap="nowrap">
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
            <Button
              visibleFrom="md"
              size="sm"
              leftSection={<IconPlus size={16} />}
              onClick={() => navigate({ to: "/media/add" })}
            >
              Add media
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
              onClick={() => {
                navigate({ to: "/dashboard" });
                close();
              }}
            />

            <SidebarNavLink
              label="Library"
              leftSection={<IconBooks size={19} />}
              active={isActive("/media")}
              onClick={() => {
                navigate({ to: "/media" });
                close();
              }}
            />

            <SidebarNavLink
              label="Activity Calendar"
              leftSection={<IconCalendar size={19} />}
              active={isActive("/calendar")}
              onClick={() => {
                navigate({ to: "/calendar" });
                close();
              }}
            />

            <SidebarNavLink
              label="Tag Management"
              leftSection={<IconTags size={19} />}
              active={isActive("/tags")}
              onClick={() => {
                navigate({ to: "/tags" });
                close();
              }}
            />

            <SidebarNavLink
              label="Source Management"
              leftSection={<IconDeviceTv size={19} />}
              active={isActive("/sources")}
              onClick={() => {
                navigate({ to: "/sources" });
                close();
              }}
            />

            <SidebarNavLink
              label="Profile"
              leftSection={<IconUser size={19} />}
              active={isActive("/profile")}
              onClick={() => {
                navigate({ to: "/profile" });
                close();
              }}
            />

            <Divider my="md" />

            <Stack gap={4}>
              <SidebarNavLink
                label="Collections"
                active={isActive("/collection", true)}
                rightSection={<IconChevronRight size={18} />}
                onClick={() => {
                  navigate({ to: "/collection" });
                  close();
                }}
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
                      close();
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>

          <Box hiddenFrom="md" mt="auto">
            <Divider my="md" />
            <Stack gap="xs">
              <Box hiddenFrom="sm">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6}>
                  Theme
                </Text>
                <ThemeOptionsList />
                <Divider my="xs" />
              </Box>
              <Button
                variant="gradient"
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  navigate({ to: "/media/add" });
                  close();
                }}
              >
                Add media
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconUser size={16} />}
                onClick={() => {
                  navigate({ to: "/profile" });
                  close();
                }}
              >
                My profile
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
