import { getTypeColor, getTypeIcon } from "#/features/media/display";
import type {
  SourceMediaRecord,
  TmdbTrendingItem,
} from "@media-voyage/shared/api";
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Image,
  Overlay,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPhotoOff, IconPlus } from "@tabler/icons-react";

function TrendingCard({
  item,
  onAdd,
}: {
  item: TmdbTrendingItem;
  onAdd: (media: SourceMediaRecord) => void;
}) {
  const { inLibrary, media } = item;
  const metadata = [
    item.releaseYear?.toString(),
    item.catalogRating === null ? null : `★ ${item.catalogRating.toFixed(1)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card withBorder p="xs">
      <Group gap="sm" wrap="nowrap" align="stretch">
        <Box
          h={64}
          w={48}
          pos="relative"
          style={{
            borderRadius: "var(--mantine-radius-sm)",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {media.imageUrl ? (
            <Image src={media.imageUrl} alt="" h={64} w={48} fit="cover" />
          ) : (
            <Box
              h={64}
              w={48}
              style={{
                alignItems: "center",
                backgroundColor: "var(--mantine-color-accent-1)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <IconPhotoOff
                size={20}
                style={{
                  color: "var(--mantine-color-accent-6)",
                  opacity: 0.6,
                }}
              />
            </Box>
          )}
          {inLibrary && <Overlay color="#000" opacity={0.24} zIndex={1} />}
        </Box>

        <Stack
          gap={6}
          style={{ flex: 1, justifyContent: "space-between", minWidth: 0 }}
        >
          <Group gap="xs" wrap="nowrap">
            {getTypeIcon(media.type)}
            <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>
              {media.title}
            </Text>
          </Group>
          {metadata && (
            <Text size="xs" c="dimmed">
              {metadata}
            </Text>
          )}

          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Badge size="xs" variant="light" color={getTypeColor(media.type)}>
              {media.type}
            </Badge>
            {inLibrary ? (
              <Text size="xs" c="dimmed" fw={600} truncate>
                Already in library
              </Text>
            ) : (
              <Button
                size="compact-xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => onAdd(media)}
              >
                Add
              </Button>
            )}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

function TrendingSection({
  title,
  items,
  onAdd,
}: {
  title: string;
  items: TmdbTrendingItem[];
  onAdd: (media: SourceMediaRecord) => void;
}) {
  return (
    <Stack gap="sm">
      <Title order={4}>{title}</Title>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
        {items.map((item) => (
          <TrendingCard
            key={`${item.media.source}:${item.media.externalId}`}
            item={item}
            onAdd={onAdd}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export function DashboardTrending({
  movies,
  shows,
  onAdd,
}: {
  movies: TmdbTrendingItem[];
  shows: TmdbTrendingItem[];
  onAdd: (media: SourceMediaRecord) => void;
}) {
  return (
    <Stack gap="md">
      <Title order={3}>Trending this week</Title>
      <TrendingSection title="Movies" items={movies} onAdd={onAdd} />
      <TrendingSection title="Shows" items={shows} onAdd={onAdd} />
    </Stack>
  );
}
