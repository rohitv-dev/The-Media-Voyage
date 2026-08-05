import { MediaCardCoverArt } from "#/features/media/components/MediaCard/MediaCardCoverArt";
import {
  getStatusColor,
  getTypeColor,
  getTypeIcon,
} from "#/features/media/display";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import type { PublicMediaSummary } from "@media-voyage/shared/api";
import {
  Badge,
  Card,
  Group,
  Progress,
  Rating,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconHeartFilled } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { gridItemMotionProps } from "#/theme/motion";

function PublicMediaCard({ media }: { media: PublicMediaSummary }) {
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.div
      {...gridItemMotionProps(reduceMotion)}
      style={{ height: "100%" }}
    >
      <Link
        to="/public/media/$publicId"
        params={{ publicId: media.publicId }}
        style={{
          display: "block",
          height: "100%",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        <Card
          withBorder
          h="100%"
          p="sm"
          style={{
            transition: "transform 160ms ease, box-shadow 160ms ease",
          }}
          styles={{
            root: {
              ":hover": {
                transform: "translateY(-4px)",
                boxShadow: "var(--mantine-shadow-md)",
              },
            },
          }}
        >
          <Card.Section>
            <MediaCardCoverArt
              imageUrl={media.imageUrl}
              coverArtSize="full"
              imageFocusX={media.imageFocusX}
              imageFocusY={media.imageFocusY}
            />
          </Card.Section>

          <Stack gap="sm" mt="sm">
            <Group
              justify="space-between"
              align="flex-start"
              gap="xs"
              wrap="nowrap"
            >
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                {getTypeIcon(media.type)}
                <Title
                  order={4}
                  lineClamp={2}
                  fw={650}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {media.title}
                </Title>
              </Group>
              {media.favorite && (
                <IconHeartFilled
                  size={17}
                  color="var(--mantine-color-red-6)"
                  aria-label="Favorite"
                />
              )}
            </Group>

            <Group gap={6} wrap="wrap">
              <Badge size="sm" variant="light" color={getTypeColor(media.type)}>
                {media.type}
              </Badge>
              <Badge size="sm" color={getStatusColor(media.status)}>
                {media.status.replaceAll("_", " ")}
              </Badge>
            </Group>

            {(media.rating !== null || media.source) && (
              <Group gap="sm" wrap="wrap">
                {media.rating !== null && (
                  <Rating
                    readOnly
                    size="sm"
                    value={media.rating / 2}
                    fractions={2}
                  />
                )}
                {media.source && (
                  <Text size="xs" c="dimmed" fw={600}>
                    {media.source}
                  </Text>
                )}
              </Group>
            )}

            {(media.status === "in_progress" || media.status === "on_hold") && (
              <Group gap="xs" wrap="nowrap">
                <Progress value={media.progress} flex={1} size="sm" />
                <Text size="xs" c="dimmed" w={34} ta="right">
                  {media.progress}%
                </Text>
              </Group>
            )}

            <Text size="xs" c="dimmed">
              Updated {dayjs(media.updatedAt).format("MMM D, YYYY")}
            </Text>
          </Stack>
        </Card>
      </Link>
    </motion.div>
  );
}

export function PublicMediaGrid({
  records,
  emptyState,
}: {
  records: PublicMediaSummary[];
  emptyState?: ReactNode;
}) {
  if (records.length === 0) return emptyState ?? null;

  return (
    <SimpleGrid
      spacing={{ base: "sm", md: "lg" }}
      verticalSpacing={{ base: "md", md: "xl" }}
      cols={{ base: 1, xs: 2, md: 3, lg: 4 }}
    >
      {records.map((record) => (
        <PublicMediaCard key={record.publicId} media={record} />
      ))}
    </SimpleGrid>
  );
}
