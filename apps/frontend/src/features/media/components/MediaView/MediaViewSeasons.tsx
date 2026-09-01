import { capitalizeWords } from "#/utils/strings";
import { Badge, Box, Group, Paper, Stack, Text } from "@mantine/core";
import type { SeasonProgressEntry } from "@media-voyage/shared/api";
import { getStatusColor } from "#/features/media/display";
import { defaultBorder, accentText } from "./constants";
import type { MediaViewData } from "./index";
import { formatDate } from "./utils";

const getSeasonEpisodeTotal = (entry: SeasonProgressEntry) =>
  entry.expectedEpisodeCount;

export function MediaViewSeasons({ data }: { data: MediaViewData }) {
  if (data.type !== "show") return null;

  return (
    <Paper
      withBorder
      p="xs"
      style={{
        overflow: "hidden",
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
                    {(entry.episodesWatched !== undefined ||
                      getSeasonEpisodeTotal(entry) !== undefined) && (
                      <Text size="xs" c="dimmed">
                        {entry.episodesWatched !== undefined
                          ? `${entry.episodesWatched}${
                              getSeasonEpisodeTotal(entry) !== undefined
                                ? `/${getSeasonEpisodeTotal(entry)}`
                                : ""
                            } episodes watched`
                          : `${getSeasonEpisodeTotal(entry)} episodes`}
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
  );
}
