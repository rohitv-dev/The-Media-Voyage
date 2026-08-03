import { EmptyState } from "#/components/EmptyState";
import {
  PublicFrame,
  PublicRouteError,
} from "#/features/public/components/PublicFrame";
import { PublicMediaGrid } from "#/features/public/components/PublicMediaGrid";
import { publicLibraryQueryOptions } from "#/features/public/queries";
import { Badge, Box, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconBooks, IconMovie } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/public/library/$publicId")({
  loader: ({ context: { queryClient }, params: { publicId } }) =>
    queryClient.ensureQueryData(publicLibraryQueryOptions(publicId)),
  errorComponent: PublicRouteError,
  component: RouteComponent,
});

function RouteComponent() {
  const { publicId } = Route.useParams();
  const { data } = useSuspenseQuery(publicLibraryQueryOptions(publicId));

  return (
    <PublicFrame ownerName={data.ownerName}>
      <Stack gap="xl" py="xl">
        <Box maw={760}>
          <Text
            size="xs"
            c="var(--mantine-primary-color-6)"
            fw={800}
            tt="uppercase"
            style={{ letterSpacing: "0.16em" }}
          >
            A shared shelf
          </Text>
          <Title
            order={1}
            fz={{ base: 38, sm: 64 }}
            lh={0.98}
            mt="sm"
            style={{ letterSpacing: "-0.06em" }}
          >
            {data.ownerName}'s public library
          </Title>
          <Text c="dimmed" size="md" lh={1.7} maw={620} mt="md">
            A read-only collection of the movies, shows, games, and books they
            have chosen to share.
          </Text>
          <Group gap="xs" mt="lg">
            <Badge variant="light" size="lg">
              {data.media.length} {data.media.length === 1 ? "title" : "titles"}
            </Badge>
            <Badge variant="light" size="lg" color="gray">
              {data.collections.length}{" "}
              {data.collections.length === 1 ? "collection" : "collections"}
            </Badge>
          </Group>
        </Box>

        {data.collections.length > 0 && (
          <Stack
            gap="md"
            component="section"
            aria-labelledby="public-collections-title"
          >
            <Group justify="space-between" align="end">
              <Box>
                <Text
                  size="xs"
                  c="dimmed"
                  fw={800}
                  tt="uppercase"
                  style={{ letterSpacing: "0.12em" }}
                >
                  Curated lists
                </Text>
                <Title id="public-collections-title" order={2} mt={4}>
                  Collections
                </Title>
              </Box>
              <IconBooks
                size={28}
                stroke={1.5}
                color="var(--mantine-primary-color-6)"
              />
            </Group>
            <Group align="stretch" gap="md" wrap="wrap">
              {data.collections.map((collection) => (
                <Link
                  key={collection.publicId}
                  to="/public/collections/$publicId"
                  params={{ publicId: collection.publicId }}
                  style={{
                    color: "inherit",
                    textDecoration: "none",
                    flex: "1 1 260px",
                  }}
                >
                  <Paper
                    withBorder
                    p="lg"
                    h="100%"
                    style={{
                      transition: "transform 160ms ease, box-shadow 160ms ease",
                    }}
                  >
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                    >
                      <Stack gap={4}>
                        <Text
                          fw={700}
                          size="lg"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          {collection.name}
                        </Text>
                        <Text size="sm" c="dimmed" lineClamp={2}>
                          {collection.description || "A shared collection"}
                        </Text>
                      </Stack>
                      <Badge variant="light" color="gray" size="sm">
                        {collection.itemCount}{" "}
                        {collection.itemCount === 1 ? "item" : "items"}
                      </Badge>
                    </Group>
                  </Paper>
                </Link>
              ))}
            </Group>
          </Stack>
        )}

        <Stack
          gap="md"
          component="section"
          aria-labelledby="public-media-title"
        >
          <Group justify="space-between" align="end">
            <Box>
              <Text
                size="xs"
                c="dimmed"
                fw={800}
                tt="uppercase"
                style={{ letterSpacing: "0.12em" }}
              >
                The full shelf
              </Text>
              <Title id="public-media-title" order={2} mt={4}>
                Public media
              </Title>
            </Box>
            <IconMovie
              size={28}
              stroke={1.5}
              color="var(--mantine-primary-color-6)"
            />
          </Group>
          <PublicMediaGrid
            records={data.media}
            emptyState={
              <EmptyState
                icon={<IconMovie size={36} />}
                title="No individual titles shared"
                description="This library has public collections, but no standalone media entries."
              />
            }
          />
        </Stack>
      </Stack>
    </PublicFrame>
  );
}
