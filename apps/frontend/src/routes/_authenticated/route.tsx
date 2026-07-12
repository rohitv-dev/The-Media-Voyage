import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Divider,
  Group,
  NavLink,
  Stack,
  Title,
} from "@mantine/core";
import {
  IconBooks,
  IconChevronRight,
  IconTrendingUp,
  IconUser,
} from "@tabler/icons-react";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useDisclosure } from "@mantine/hooks";
import { collectionQueryOptions } from "#/features/mediaCollection/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(collectionQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const [opened, { toggle }] = useDisclosure();

  const { data: collections } = useSuspenseQuery(collectionQueryOptions);

  console.log("Authenticated mounted");

  useEffect(() => {
    return () => {
      console.log("Authenticated unmounted");
    };
  }, []);

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
            <Title
              order={3}
              onClick={() => navigate({ to: "/media" })}
              style={{ cursor: "pointer" }}
            >
              {">"} Media Voyage {"<"}
            </Title>
          </Group>

          <Group visibleFrom="md">
            <Button size="xs" onClick={() => navigate({ to: "/media/add" })}>
              Add Media
            </Button>
            <Avatar onClick={() => navigate({ to: "/profile" })} />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <Stack gap="xs" p="sm">
          <NavLink
            label="Dashboard"
            leftSection={<IconTrendingUp />}
            onClick={() => navigate({ to: "/dashboard" })}
          />

          <NavLink
            label="Library"
            leftSection={<IconBooks />}
            onClick={() => navigate({ to: "/media" })}
          />

          <NavLink
            label="Profile"
            leftSection={<IconUser />}
            onClick={() => navigate({ to: "/profile" })}
          />

          <Divider my="md" />

          <Stack gap={0}>
            <NavLink
              label="Collections"
              active={false}
              rightSection={<IconChevronRight size={18} />}
              onClick={() => navigate({ to: "/collection" })}
            />

            <Stack gap={4}>
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
                  onClick={() =>
                    navigate({
                      to: "/collection/edit/$id",
                      params: { id: collection.id },
                    })
                  }
                />
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Button
            hiddenFrom="md"
            variant="gradient"
            onClick={() => navigate({ to: "/media/add" })}
          >
            Add Media
          </Button>
          <Button
            hiddenFrom="md"
            variant="light"
            onClick={() => navigate({ to: "/profile" })}
          >
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
