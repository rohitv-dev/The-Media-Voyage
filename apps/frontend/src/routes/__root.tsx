import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Button, Center, Stack, Text, Title } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { getApiErrorMessage } from "#/lib/api";
import { recommendationModals } from "#/features/recommendations/components/ContextModal";

interface RouteContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouteContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

function RootComponent() {
  return (
    <ModalsProvider modals={recommendationModals}>
      <Outlet />
    </ModalsProvider>
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

export function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <Center w="100%" mih="60vh" p={{ base: "md", sm: "xl" }}>
      <Stack align="center" gap="xs">
        <Title order={2}>Something went wrong</Title>
        <Text c="dimmed" ta="center" maw={420}>
          {getApiErrorMessage(error, "Please try again.")}
        </Text>
        <Button mt="md" onClick={() => void router.invalidate()}>
          Try again
        </Button>
      </Stack>
    </Center>
  );
}
