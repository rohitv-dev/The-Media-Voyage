import {
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
} from "@mantine/core";
import { IconBooks, IconMovie, IconPlus, IconStar } from "@tabler/icons-react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useDisclosure } from "@mantine/hooks";

export const Route = createFileRoute("/_authenticated")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: "md",
        collapsed: { mobile: !opened },
      }}
    >
      <AppShell.Header>
        <Group justify="space-between" h="100%" px="lg">
          <Group gap="xs" align="center">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <IconMovie />
            <Title
              order={3}
              onClick={() => navigate({ to: "/media" })}
              style={{ cursor: "pointer" }}
            >
              Media Voyage
            </Title>
          </Group>

          <Group visibleFrom="md">
            <Button
              size="xs"
              variant="gradient"
              onClick={() => navigate({ to: "/media/add" })}
            >
              Add Media
            </Button>
            <Avatar />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <Stack gap="xs" p="sm">
          <NavLink label="Library" leftSection={<IconBooks />} />

          <NavLink label="Favorites" leftSection={<IconStar />} />

          <Divider my="md" />

          <Text fw={700} size="sm">
            Collections
          </Text>

          <Button variant="light" leftSection={<IconPlus />}>
            New Collection
          </Button>

          <Divider />

          <Button
            hiddenFrom="md"
            variant="gradient"
            onClick={() => navigate({ to: "/media/add" })}
          >
            Add Media
          </Button>
          <Button hiddenFrom="md" variant="light">
            My Profile
          </Button>
        </Stack>
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
