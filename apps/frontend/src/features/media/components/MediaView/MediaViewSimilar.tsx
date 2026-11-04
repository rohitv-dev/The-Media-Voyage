import {
  Box,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { similarLibraryMediaOptions } from "../../queries";
import { MediaCardCoverArt } from "../MediaCard/MediaCardCoverArt";

export function MediaViewSimilar({ id }: { id: string }) {
  const { data } = useQuery(similarLibraryMediaOptions(id));

  // This optional section stays out of the way while loading or on failure.
  if (!data?.length) return null;

  return (
    <Stack
      component="section"
      aria-label="Similar in Your Library"
      gap="xs"
      mt="md"
    >
      <Title order={3} size="sm">
        Similar in Your Library
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
        {data.map((item) => (
          <Card
            key={item.id}
            renderRoot={(props) => (
              <Link {...props} to="/media/view/$id" params={{ id: item.id }} />
            )}
            withBorder
            p="xs"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <Group gap="xs" wrap="nowrap">
              <Box w={40} miw={40}>
                <MediaCardCoverArt
                  imageUrl={item.imageUrl}
                  imageFocusX={item.imageFocusX}
                  imageFocusY={item.imageFocusY}
                  coverArtSize="full"
                />
              </Box>
              <Stack gap={2} miw={0}>
                <Text size="sm" fw={600} lineClamp={2}>
                  {item.title}
                </Text>
                <Text size="xs" c="dimmed" tt="capitalize">
                  {item.type}
                </Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
