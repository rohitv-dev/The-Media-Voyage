import { NamedEntityRow } from "#/components/NamedEntityRow";
import { tagsQueryOptions } from "#/features/tags/queries";
import { Card, Container, Stack, Text, Title } from "@mantine/core";
import { IconTags } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tags")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(tagsQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  return (
    <Container size="md" pt="md" pb="md">
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={2}>Tag Management</Title>
          <Text c="dimmed" size="sm">
            Rename, recolor, or remove the tags you use across your library.
          </Text>
        </Stack>

        {tags.length === 0 ? (
          <Card withBorder p="xl">
            <Stack align="center" gap="xs">
              <IconTags size={36} />
              <Text fw={600}>No tags yet</Text>
              <Text c="dimmed" size="sm" ta="center">
                Tags you add to media items will show up here.
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="xs">
            {tags.map((tag) => (
              <NamedEntityRow
                key={tag.id}
                entity={tag}
                basePath="/tags"
                entityLabel="tag"
                invalidateKeys={[["tags"], ["user-media"]]}
                filterKey="tags"
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
