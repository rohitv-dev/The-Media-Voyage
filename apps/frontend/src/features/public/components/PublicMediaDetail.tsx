import { getStatusColor, getTypeIcon } from "#/features/media/display";
import { getImageObjectPosition } from "#/features/media/imageFocus";
import { formatDuration } from "#/features/media/formatDuration";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import type {
  PublicMediaDetail as PublicMediaDetailData,
  SeasonProgressEntry,
} from "@media-voyage/shared/api";
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Image,
  Paper,
  Progress,
  Rating,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconPlayerPlay } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
import dayjs from "dayjs";
import { Fragment } from "react";
import type { ReactNode } from "react";

const formatDate = (value: Date | string | null | undefined) =>
  value ? dayjs(value).format("MMM D, YYYY") : "—";

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box p="md">
      <Text
        size="xs"
        c="dimmed"
        fw={800}
        tt="uppercase"
        style={{ letterSpacing: "0.1em" }}
        mb={4}
      >
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {children}
      </Text>
    </Box>
  );
}

function SeasonRow({ season }: { season: SeasonProgressEntry }) {
  return (
    <Group justify="space-between" wrap="wrap" gap="xs" p="md">
      <Group gap="xs" wrap="wrap">
        <Text size="sm" fw={700}>
          Season {season.season}
        </Text>
        <Badge size="sm" variant="light" color={getStatusColor(season.status)}>
          {season.status.replaceAll("_", " ")}
        </Badge>
        {season.episodesWatched !== undefined && (
          <Text size="xs" c="dimmed">
            {season.episodesWatched}
            {season.expectedEpisodeCount !== null &&
            season.expectedEpisodeCount !== undefined
              ? `/${season.expectedEpisodeCount}`
              : ""}{" "}
            episodes
          </Text>
        )}
        {season.rating !== undefined && (
          <Text size="xs" c="dimmed">
            ★ {season.rating.toFixed(1)}
          </Text>
        )}
      </Group>
      <Text size="xs" c="dimmed">
        Updated {formatDate(season.updatedAt)}
      </Text>
    </Group>
  );
}

export function PublicMediaDetail({ data }: { data: PublicMediaDetailData }) {
  const router = useRouter();
  const reduceMotion = useAppReducedMotion();
  const progress = Math.min(100, Math.max(0, data.progress));
  const metadata = data.catalogMetadata;
  const runtime = "runtime" in metadata ? metadata.runtime : undefined;

  return (
    <Stack gap="lg" py={{ base: "md", sm: "xl" }} maw={980} mx="auto">
      <Box>
        <ButtonBack onClick={() => router.history.back()} />
      </Box>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card withBorder p={{ base: "sm", sm: "lg" }}>
          <Grid gap={{ base: "md", sm: "xl" }} align="flex-start">
            <Grid.Col span={{ base: 5, xs: 4, sm: 3 }}>
              <Image
                src={data.imageUrl === "N/A" ? null : data.imageUrl}
                alt={data.title}
                radius="sm"
                fit="cover"
                fallbackSrc="https://placehold.co/336x504?text=No+Image"
                style={{
                  width: "100%",
                  aspectRatio: "2 / 3",
                  objectPosition: getImageObjectPosition("full", data),
                }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 7, xs: 8, sm: 9 }}>
              <Stack gap="sm">
                <Group gap="xs" c="primary">
                  {getTypeIcon(data.type)}
                  <Text
                    size="xs"
                    fw={800}
                    tt="uppercase"
                    style={{ letterSpacing: "0.12em" }}
                  >
                    {data.ownerName}'s public entry
                  </Text>
                </Group>
                <Title
                  order={1}
                  fz={{ base: 30, sm: 50 }}
                  lh={1}
                  style={{ overflowWrap: "anywhere", letterSpacing: "-0.05em" }}
                >
                  {data.title}
                </Title>
                <Group gap={6} wrap="wrap">
                  <Badge color={getStatusColor(data.status)}>
                    {data.status.replaceAll("_", " ")}
                  </Badge>
                  {data.favorite && <Badge variant="light">Favorite</Badge>}
                </Group>
                {data.tags.length > 0 && (
                  <Group gap={6} wrap="wrap">
                    {data.tags.map((tag) => (
                      <Badge key={tag} variant="dot" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                )}
                <Text c="dimmed" size="sm" lh={1.7} maw={650}>
                  {data.description?.trim() ||
                    "No description available for this media item."}
                </Text>
                <Box mt="sm">
                  <Group justify="space-between" mb={6}>
                    <Group gap={6}>
                      {progress === 100 ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconPlayerPlay size={16} />
                      )}
                      <Text size="xs" fw={700}>
                        {progress === 100 ? "Completed" : "Progress"}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" fw={700}>
                      {progress}%
                    </Text>
                  </Group>
                  <Progress value={progress} size="sm" radius="xl" />
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>
      </motion.div>

      <Paper withBorder p="xs" style={{ overflow: "hidden" }}>
        <Group px="md" py="sm" justify="space-between">
          <Text size="sm" fw={800} c="primary">
            Details
          </Text>
          {data.rating !== null && (
            <Rating readOnly size="sm" value={data.rating / 2} fractions={2} />
          )}
        </Group>
        <Divider />
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={0}>
          <DetailItem label="Source">{data.source ?? "—"}</DetailItem>
          <DetailItem label="Started">{formatDate(data.startedAt)}</DetailItem>
          <DetailItem label="Completed">
            {formatDate(data.completedAt)}
          </DetailItem>
          <DetailItem label="Last updated">
            {formatDate(data.lastProgressUpdate)}
          </DetailItem>
          <DetailItem label="Time logged">
            {formatDuration(data.timeSpent ?? 0)}
          </DetailItem>
          <DetailItem label="Pages read">{data.pagesRead ?? "—"}</DetailItem>
          <DetailItem label="Catalog source">
            {data.catalogSource ?? "—"}
          </DetailItem>
          {metadata.genre && (
            <DetailItem label="Genre">{metadata.genre}</DetailItem>
          )}
          {runtime && <DetailItem label="Runtime">{runtime}</DetailItem>}
          {metadata.catalogRating && (
            <DetailItem label="Catalog rating">
              {metadata.catalogRating}
            </DetailItem>
          )}
        </SimpleGrid>
      </Paper>

      {data.type === "show" && (
        <Paper withBorder p="xs" style={{ overflow: "hidden" }}>
          <Group px="md" py="sm" justify="space-between">
            <Text size="sm" fw={800} c="primary">
              Seasons
            </Text>
            <Text size="xs" c="dimmed">
              {data.seasonsProgress.length} tracked
            </Text>
          </Group>
          <Divider />
          {data.seasonsProgress.length === 0 ? (
            <Text size="sm" c="dimmed" p="md">
              No seasons tracked yet.
            </Text>
          ) : (
            <Stack gap={0}>
              {[...data.seasonsProgress]
                .sort((a, b) => a.season - b.season)
                .map((season, index) => (
                  <Fragment key={season.season}>
                    {index > 0 && <Divider />}
                    <SeasonRow season={season} />
                  </Fragment>
                ))}
            </Stack>
          )}
        </Paper>
      )}

      <Paper withBorder p={{ base: "md", sm: "lg" }}>
        <Text size="sm" fw={800} c="primary">
          Review
        </Text>
        <Divider my="sm" />
        <Text size="sm" lh={1.7} style={{ whiteSpace: "pre-wrap" }}>
          {data.review?.trim() || "No review has been added yet."}
        </Text>
      </Paper>
    </Stack>
  );
}

function ButtonBack({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="subtle"
      leftSection={<IconArrowLeft size={16} />}
      px={0}
      fw={600}
      onClick={onClick}
    >
      Back
    </Button>
  );
}
