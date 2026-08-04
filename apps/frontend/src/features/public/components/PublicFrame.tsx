import {
  Box,
  Button,
  Center,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { ApiError, getApiErrorMessage } from "#/lib/api";

export function PublicFrame({
  ownerName,
  context = "Public library",
  children,
}: {
  ownerName?: string;
  context?: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="main"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 90% 0%, color-mix(in srgb, var(--mantine-primary-color-4) 18%, transparent), transparent 34rem), var(--mantine-color-body)",
      }}
    >
      <Container size={1280} px={{ base: "md", sm: "xl" }}>
        <Group
          component="header"
          justify="space-between"
          py={{ base: "md", sm: "lg" }}
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Link
            to="/"
            aria-label="Media Voyage home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              color: "var(--mantine-color-text)",
              textDecoration: "none",
            }}
          >
            <img
              src="/media-voyage-mark.svg"
              alt=""
              aria-hidden="true"
              width="24"
              height="24"
            />
            <Text fw={700} style={{ letterSpacing: "-0.04em" }}>
              Media Voyage
            </Text>
          </Link>

          <Group gap="xs" wrap="nowrap">
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={800}
              style={{ letterSpacing: "0.12em" }}
            >
              {context}
            </Text>
            {ownerName && (
              <Text size="sm" fw={600} truncate maw={{ base: 130, sm: 240 }}>
                · {ownerName}
              </Text>
            )}
          </Group>
        </Group>

        {children}

        <Text
          component="footer"
          size="xs"
          c="dimmed"
          ta="center"
          py={{ base: "xl", sm: 48 }}
        >
          Shared from Media Voyage
        </Text>
      </Container>
    </Box>
  );
}

export function PublicRouteError({ error, reset }: ErrorComponentProps) {
  const isNotFound = error instanceof ApiError && error.status === 404;

  return (
    <PublicFrame context="Public link">
      <Center mih="60vh" py="xl">
        <Stack align="center" gap="xs">
          <Title order={1}>
            {isNotFound ? "404" : "This link is unavailable"}
          </Title>
          <Text c="dimmed" ta="center" maw={440}>
            {isNotFound
              ? "This public page does not exist or is no longer shared."
              : getApiErrorMessage(error, "Please try again.")}
          </Text>
          <Button
            component={Link}
            to="/"
            mt="md"
            onClick={isNotFound ? undefined : reset}
          >
            Back home
          </Button>
        </Stack>
      </Center>
    </PublicFrame>
  );
}
