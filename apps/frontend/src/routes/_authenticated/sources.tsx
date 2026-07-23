import { NamedEntityRow } from "#/components/NamedEntityRow";
import { sourcesQueryOptions } from "#/features/sources/queries";
import { Card, Container, Stack, Text, Title } from "@mantine/core";
import { IconDeviceTv } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sources")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sourcesQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: sources } = useSuspenseQuery(sourcesQueryOptions);

  return (
    <Container size="md" pt="md" pb="md">
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={2}>Source Management</Title>
          <Text c="dimmed" size="sm">
            Rename, recolor, or remove the sources you track media against.
          </Text>
        </Stack>

        {sources.length === 0 ? (
          <Card withBorder p="xl">
            <Stack align="center" gap="xs">
              <IconDeviceTv size={36} />
              <Text fw={600}>No sources yet</Text>
              <Text c="dimmed" size="sm" ta="center">
                Sources you add to media items will show up here.
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="xs">
            {sources.map((source) => (
              <NamedEntityRow
                key={source.id}
                entity={source}
                basePath="/sources"
                entityLabel="source"
                invalidateKeys={[["sources"], ["user-media"]]}
                filterKey="sources"
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
