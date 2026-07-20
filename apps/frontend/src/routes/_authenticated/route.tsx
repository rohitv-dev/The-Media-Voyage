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
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBooks,
  IconChevronRight,
  IconLogout,
  IconMoon,
  IconPlus,
  IconSun,
  IconTrendingUp,
  IconUser,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import { getSession } from "#/auth/session";
import { authClient } from "#/auth/authClient";

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

function ColorSchemeToggle({ mobile = false }: { mobile?: boolean }) {
  const { toggleColorScheme } = useMantineColorScheme({
    keepTransitions: true,
  });
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDark = computedColorScheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const icon = isDark ? <IconSun size={18} /> : <IconMoon size={18} />;

  if (mobile) {
    return (
      <Button
        fullWidth
        variant="light"
        color="gray"
        leftSection={icon}
        onClick={() => toggleColorScheme()}
      >
        {isDark ? "Light mode" : "Dark mode"}
      </Button>
    );
  }

  return (
    <Tooltip label={label} withArrow>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        aria-label={label}
        onClick={() => toggleColorScheme()}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

function RouteComponent() {
  const navigate = Route.useNavigate();
  const [opened, { toggle, close }] = useDisclosure();
  const { data: collections } = useSuspenseQuery(collectionQueryOptions);

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
              <ColorSchemeToggle />
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
                  color="indigo"
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
            <NavLink
              label="Dashboard"
              leftSection={<IconTrendingUp size={19} />}
              onClick={() => {
                navigate({ to: "/dashboard" });
                close();
              }}
            />

            <NavLink
              label="Library"
              leftSection={<IconBooks size={19} />}
              onClick={() => {
                navigate({ to: "/media" });
                close();
              }}
            />

            <NavLink
              label="Profile"
              leftSection={<IconUser size={19} />}
              onClick={() => {
                navigate({ to: "/profile" });
                close();
              }}
            />

            <Divider my="md" />

            <Stack gap={4}>
              <NavLink
                label="Collections"
                active={false}
                rightSection={<IconChevronRight size={18} />}
                onClick={() => {
                  navigate({ to: "/collection" });
                  close();
                }}
              />

              <Stack gap={4} pl="sm">
                {collections.map((collection) => (
                  <NavLink
                    key={collection.id}
                    label={collection.name}
                    description={
                      collection.description
                        ? String(collection.description)
                        : undefined
                    }
                    leftSection={<IconBooks size={16} />}
                    onClick={() => {
                      navigate({
                        to: "/collection/edit/$id",
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
                <ColorSchemeToggle mobile />
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
    </AppShell>
  );
}
