import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Image,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconEdit,
  IconHeartFilled,
  IconNotebook,
  IconPencil,
  IconPlayerPlay,
  IconQuote,
} from "@tabler/icons-react";
import type { MediaDetailedRecord } from "@media-voyage/shared/api";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { getStatusColor } from "#/features/media/functions";
import { useSourceColorMap } from "#/features/sources/queries";
import { useTagColorMap } from "#/features/tags/queries";

type CatalogMetadata = {
  genre?: string;
  runtime?: string;
  catalogRating?: string;
};

const formatDate = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

const formatValue = (value?: string | number | null) =>
  value === undefined || value === null || value === "" ? "—" : value;

const defaultBorder = "var(--mantine-color-default-border)";
const accentText = "var(--mantine-primary-color-filled)";

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box p="md" style={{ borderTop: `1px solid ${defaultBorder}` }}>
      <Text
        size="xs"
        c="dimmed"
        fw={700}
        tt="uppercase"
        mb={5}
        style={{ letterSpacing: "0.1em" }}
      >
        {label}
      </Text>
      <Text component="div" size="sm" fw={600} lh={1.35}>
        {value}
      </Text>
    </Box>
  );
}

function ReadingPanel({
  icon,
  title,
  children,
  reducedMotion,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.25, delay: 0.12 }}
      style={{ height: "100%" }}
    >
      <Paper
        withBorder
        p={{ base: "md", sm: "lg" }}
        h="100%"
        style={{ borderColor: defaultBorder }}
      >
        <Group gap="xs" mb="md">
          <ThemeIcon variant="light" c="primary" size={30} radius="sm">
            {icon}
          </ThemeIcon>
          <Title order={4}>{title}</Title>
        </Group>
        <Text size="sm" lh={1.75} style={{ whiteSpace: "pre-wrap" }}>
          {children}
        </Text>
      </Paper>
    </motion.div>
  );
}

/**
 * Friend-facing payloads omit `notes` (owner-only) and `visibility`, so both
 * keys are optional here while an owner's full record stays assignable.
 */
type MediaViewData = Omit<MediaDetailedRecord, "notes" | "visibility"> &
  Partial<Pick<MediaDetailedRecord, "notes" | "visibility">>;

type MediaViewProps = {
  data: MediaViewData;
  /** Hides the owner-only Update action. */
  readOnly?: boolean;
  onBack?: () => void;
  backLabel?: string;
  /** Overrides the "<type> / library entry" kicker above the title. */
  eyebrow?: string;
  /** Rendered below the review/notes panels — used for the social panel. */
  footer?: React.ReactNode;
};

export function MediaView({
  data,
  readOnly,
  onBack,
  backLabel = "Back to library",
  eyebrow,
  footer,
}: MediaViewProps) {
  const navigate = useNavigate();
  // Absent (rather than empty) notes mean the viewer isn't the owner.
  const showNotes = data.notes !== undefined;
  const reducedMotion = useAppReducedMotion();
  const progress = Math.min(100, Math.max(0, data.progress ?? 0));
  const sourceColorMap = useSourceColorMap();
  const tagColorMap = useTagColorMap();

  const catalogMetadata = data.catalogMetadata as CatalogMetadata | null;

  const metaItems = [
    { label: "Status", value: capitalizeWords(data.status) },
    { label: "Rating", value: formatValue(data.rating?.toFixed(1)) },
    {
      label: "Source",
      value: data.source ? (
        <Badge
          variant="dot"
          color={sourceColorMap.get(data.source) ?? "gray"}
          size="sm"
        >
          {data.source}
        </Badge>
      ) : (
        "—"
      ),
    },
    { label: "Started", value: formatDate(data.startedAt) },
    { label: "Completed", value: formatDate(data.completedAt) },
    ...(catalogMetadata?.genre
      ? [{ label: "Genre", value: catalogMetadata.genre }]
      : []),
    ...(catalogMetadata?.catalogRating
      ? [{ label: "Catalog Rating", value: catalogMetadata.catalogRating }]
      : []),
  ];

  return (
    <Container size="md" py={{ base: "sm", sm: "xl" }}>
      <Stack gap="md">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          px={0}
          fw={600}
          style={{ alignSelf: "flex-start" }}
          onClick={() => (onBack ? onBack() : navigate({ to: "/media" }))}
        >
          {backLabel}
        </Button>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            withBorder
            p={{ base: "sm", sm: "lg" }}
            style={{
              position: "relative",
              overflow: "hidden",
              borderColor: defaultBorder,
            }}
          >
            <Grid
              gap={{ base: "sm", sm: "lg" }}
              align="flex-start"
              pos="relative"
            >
              <Grid.Col span={{ base: 4, xs: 3, sm: 3 }}>
                <Image
                  src={data.imageUrl === "N/A" ? null : data.imageUrl}
                  alt={data.title}
                  radius="sm"
                  fit="cover"
                  fallbackSrc="https://placehold.co/336x504?text=No+Image"
                  style={{
                    width: "100%",
                    aspectRatio: "2 / 3",
                    boxShadow:
                      "light-dark(0 14px 26px rgba(31, 41, 55, 0.16), 0 18px 34px rgba(0, 0, 0, 0.42))",
                  }}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 8, xs: 9, sm: 9 }}>
                <Stack gap={0} h="100%">
                  <Text
                    size="xs"
                    fw={800}
                    tt="uppercase"
                    mb="xs"
                    style={{ letterSpacing: "0.05em", color: accentText }}
                  >
                    {eyebrow ?? `${capitalizeWords(data.type)} / library entry`}
                  </Text>

                  <Group
                    align="flex-start"
                    justify="space-between"
                    gap="md"
                    wrap="wrap"
                  >
                    <Title
                      order={1}
                      fz={{ base: 28, sm: 48 }}
                      lh={1}
                      lts="-0.045em"
                      maw={650}
                      style={{ overflowWrap: "anywhere", flex: "1 1 220px" }}
                    >
                      {data.title}
                    </Title>
                    {!readOnly && (
                      <Button
                        w={{ base: "100%", xs: "auto" }}
                        flex="0 0 auto"
                        leftSection={<IconEdit size={16} />}
                        onClick={() =>
                          navigate({
                            to: "/media/update/$id",
                            params: { id: data.id },
                          })
                        }
                      >
                        Update
                      </Button>
                    )}
                  </Group>

                  <Group gap={6} mt={{ base: "sm", sm: "md" }}>
                    <Badge variant="light" size="sm">
                      {capitalizeWords(data.status)}
                    </Badge>
                    {data.visibility && (
                      <Badge variant="outline" size="sm">
                        {capitalizeWords(data.visibility)}
                      </Badge>
                    )}
                    {data.favorite && (
                      <Badge
                        leftSection={<IconHeartFilled size={12} />}
                        size="sm"
                      >
                        Favorite
                      </Badge>
                    )}
                    {data.catalogSource === "manual" && (
                      <Tooltip label="This title was entered manually and isn't matched to a verified catalog entry, so it has no synced poster or description">
                        <Badge
                          variant="outline"
                          leftSection={<IconPencil size={12} />}
                          size="sm"
                        >
                          Manually added
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>

                  {data.tags.length > 0 && (
                    <Group gap={6} mt="sm">
                      {data.tags.map((tag) => (
                        <Badge
                          key={tag}
                          radius="xl"
                          variant="dot"
                          color={tagColorMap.get(tag) ?? "gray"}
                          size="sm"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  )}

                  <Text
                    c="dimmed"
                    size="sm"
                    lh={1.65}
                    mt={{ base: "sm", sm: "md" }}
                    maw={680}
                  >
                    {data.description?.trim() ||
                      "No description available for this media item."}
                  </Text>

                  <Box maw={480} mt="auto" pt={{ base: "md", sm: "xl" }}>
                    <Group justify="space-between" gap="xs" mb={6}>
                      <Group gap={6}>
                        <ThemeIcon variant="transparent" c="primary" size={18}>
                          {progress === 100 ? (
                            <IconCheck size={15} stroke={2.5} />
                          ) : (
                            <IconPlayerPlay size={15} stroke={2.5} />
                          )}
                        </ThemeIcon>
                        <Text size="xs" fw={700}>
                          {progress === 100
                            ? "Completed"
                            : readOnly
                              ? "Progress"
                              : "Your progress"}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" fw={700}>
                        {progress}%
                      </Text>
                    </Group>
                    <Progress
                      value={progress}
                      size="sm"
                      radius="xl"
                      c="primary"
                    />
                  </Box>
                </Stack>
              </Grid.Col>
            </Grid>
          </Card>
        </motion.div>

        <Paper
          withBorder
          p="xs"
          style={{
            overflow: "hidden",
            borderColor: defaultBorder,
          }}
        >
          <Group justify="space-between" px="md" py="sm">
            <Group gap="xs">
              {/* <IconCalendar size={17} /> */}
              <Text size="sm" fw={800} style={{ color: accentText }}>
                Details
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {progress}% tracked
            </Text>
          </Group>
          <SimpleGrid
            cols={{ base: 2, xs: 3, sm: metaItems.length }}
            spacing={0}
          >
            {metaItems.map((item) => (
              <MetaItem
                key={item.label}
                label={item.label}
                value={item.value}
              />
            ))}
          </SimpleGrid>
        </Paper>

        {data.type === "show" && (
          <Paper
            withBorder
            p="xs"
            style={{
              overflow: "hidden",
              borderColor: defaultBorder,
            }}
          >
            <Group justify="space-between" px="md" py="sm">
              <Text size="sm" fw={800} style={{ color: accentText }}>
                Seasons
              </Text>
              <Text size="xs" c="dimmed">
                {data.seasonsProgress.length} tracked
              </Text>
            </Group>

            <Stack gap={0}>
              {data.seasonsProgress.length === 0 ? (
                <Box p="md" style={{ borderTop: `1px solid ${defaultBorder}` }}>
                  <Text size="sm" c="dimmed">
                    No seasons tracked yet.
                  </Text>
                </Box>
              ) : (
                [...data.seasonsProgress]
                  .sort((a, b) => a.season - b.season)
                  .map((entry) => (
                    <Box
                      key={entry.season}
                      p="md"
                      style={{ borderTop: `1px solid ${defaultBorder}` }}
                    >
                      <Group justify="space-between" wrap="wrap" gap="xs">
                        <Group gap="xs" wrap="wrap">
                          <Text size="sm" fw={700}>
                            Season {entry.season}
                          </Text>
                          <Badge
                            variant="light"
                            size="sm"
                            color={getStatusColor(entry.status)}
                          >
                            {capitalizeWords(entry.status)}
                          </Badge>
                          {entry.episodesWatched !== undefined && (
                            <Text size="xs" c="dimmed">
                              {entry.episodesWatched} episodes watched
                            </Text>
                          )}
                          {entry.rating !== undefined && (
                            <Text size="xs" c="dimmed">
                              ★ {entry.rating.toFixed(1)}
                            </Text>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          Updated {formatDate(entry.updatedAt)}
                        </Text>
                      </Group>

                      {entry.notes?.trim() && (
                        <Text
                          size="xs"
                          c="dimmed"
                          mt={6}
                          lh={1.5}
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {entry.notes}
                        </Text>
                      )}
                    </Box>
                  ))
              )}
            </Stack>
          </Paper>
        )}

        <SimpleGrid cols={{ base: 1, sm: showNotes ? 2 : 1 }} spacing="md">
          <ReadingPanel
            icon={<IconQuote size={17} />}
            title="Review"
            reducedMotion={reducedMotion}
          >
            {data.review?.trim() || "No review has been added yet."}
          </ReadingPanel>
          {showNotes && (
            <ReadingPanel
              icon={<IconNotebook size={17} />}
              title="Notes"
              reducedMotion={reducedMotion}
            >
              {data.notes?.trim() || "No notes have been added yet."}
            </ReadingPanel>
          )}
        </SimpleGrid>

        {footer}
      </Stack>
    </Container>
  );
}
