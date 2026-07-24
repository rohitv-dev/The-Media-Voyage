import { Outlet, Link, createRootRouteWithContext } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { FullScreenLoader } from "#/components/FullScreenLoader";
import { frontendConfig } from "#/config";

interface RouteContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouteContext>()({
  component: RootComponent,
  pendingComponent: FullScreenLoader,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      {!frontendConfig.isProduction && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </>
  );
}

function NotFound() {
  return (
    <Center w="100%" mih="100vh" p={{ base: "md", sm: "xl" }}>
      <Stack align="center" gap="xs">
        <Title order={1}>404</Title>
        <Text c="dimmed">This page doesn't exist.</Text>
        <Button component={Link} to="/" mt="md">
          Back home
        </Button>
      </Stack>
    </Center>
  );
}

function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <Center w="100%" mih="60vh" p={{ base: "md", sm: "xl" }}>
      <Stack align="center" gap="xs">
        <Title order={2}>Something went wrong</Title>
        <Text c="dimmed" ta="center" maw={420}>
          {error instanceof Error ? error.message : "Please try again."}
        </Text>
        <Button mt="md" onClick={reset}>
          Try again
        </Button>
      </Stack>
    </Center>
  );
}
