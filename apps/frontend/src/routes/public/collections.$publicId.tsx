import { EmptyState } from "#/components/EmptyState";
import {
  PublicFrame,
  PublicRouteError,
} from "#/features/public/components/PublicFrame";
import { PublicMediaGrid } from "#/features/public/components/PublicMediaGrid";
import { publicCollectionQueryOptions } from "#/features/public/queries";
import { Badge, Box, Group, Stack, Text, Title } from "@mantine/core";
import { IconBooks } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/public/collections/$publicId")({
  loader: ({ context: { queryClient }, params: { publicId } }) => {
    queryClient.ensureQueryData(publicCollectionQueryOptions(publicId));
  },
  errorComponent: PublicRouteError,
  component: RouteComponent,
});

function RouteComponent() {
  const { publicId } = Route.useParams();
  const { data } = useSuspenseQuery(publicCollectionQueryOptions(publicId));
  const { collection, data: records } = data;

  return (
    <PublicFrame ownerName={data.ownerName} context="Public collection">
      <Stack gap="xl" py="xl">
        <Stack gap="sm" maw={760}>
          <Group gap="xs" c="var(--mantine-primary-color-6)">
            <IconBooks size={22} stroke={1.6} />
            <Text
              size="xs"
              fw={800}
              tt="uppercase"
              style={{ letterSpacing: "0.14em" }}
            >
              Shared collection
            </Text>
          </Group>
          <Group gap="sm" align="center" wrap="wrap">
            <Title
              order={1}
              fz={{ base: 38, sm: 56 }}
              lh={1}
              style={{ letterSpacing: "-0.055em", overflowWrap: "anywhere" }}
            >
              {collection.name}
            </Title>
            <Badge variant="light" color="gray">
              {collection.itemCount}{" "}
              {collection.itemCount === 1 ? "item" : "items"}
            </Badge>
          </Group>
          <Text c="dimmed" size="md" lh={1.7}>
            {collection.description ||
              "A shared collection from the public library."}
          </Text>
        </Stack>

        <Stack gap="md">
          <Box>
            <Text
              size="xs"
              c="dimmed"
              fw={800}
              tt="uppercase"
              style={{ letterSpacing: "0.12em" }}
            >
              Inside this collection
            </Text>
            <Title order={2} mt={4}>
              Public entries
            </Title>
          </Box>
          <PublicMediaGrid
            records={records}
            emptyState={
              <EmptyState
                icon={<IconBooks size={36} />}
                title="No public entries yet"
                description="The collection is public, but its individual entries are not."
              />
            }
          />
        </Stack>
      </Stack>
    </PublicFrame>
  );
}
