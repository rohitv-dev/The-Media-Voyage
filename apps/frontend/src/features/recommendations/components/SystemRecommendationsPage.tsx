import { EmptyState } from "#/components/EmptyState";
import {
  getMediaSourceLabel,
  getTypeColor,
  getTypeIcon,
} from "#/features/media/display";
import { MediaCardCoverArt } from "#/features/media/components/MediaCard/MediaCardCoverArt";
import { MediaCardSkeleton } from "#/features/media/components/MediaCardSkeleton";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { showErrorNotification } from "#/lib/notifications";
import { gridItemMotionProps, pageStaggerVariants } from "#/theme/motion";
import type {
  SourceMediaRecord,
  SystemRecommendationPreviewResponse,
} from "@media-voyage/shared/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconBooks,
  IconPlus,
  IconSparkles,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  dismissSystemRecommendation,
  systemRecommendationPreviewOptions,
} from "../queries";

type Recommendation =
  SystemRecommendationPreviewResponse["recommendations"][number];

function RecommendationCard({
  recommendation,
  onAdd,
  onDismiss,
  isDismissing,
}: {
  recommendation: Recommendation;
  onAdd: (media: SourceMediaRecord) => void;
  onDismiss: (media: Recommendation["media"]) => void;
  isDismissing: boolean;
}) {
  const reduceMotion = useAppReducedMotion();
  const { media } = recommendation;

  return (
    <motion.div
      {...gridItemMotionProps(reduceMotion)}
      style={{ height: "100%" }}
    >
      <Card withBorder h="100%" p="sm">
        <Card.Section>
          <MediaCardCoverArt
            imageUrl={media.imageUrl}
            coverArtSize="full"
            imageFocusX={null}
            imageFocusY={null}
          />
        </Card.Section>

        <Stack gap="sm" mt="sm" h="100%">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Group gap="xs" align="flex-start" wrap="nowrap" miw={0}>
              {getTypeIcon(media.type)}
              <Title order={3} fz="md" fw={700} lineClamp={2}>
                {media.title}
              </Title>
            </Group>
            <Badge size="sm" variant="light" color={getTypeColor(media.type)}>
              {media.type}
            </Badge>
          </Group>

          <Text size="xs" c="dimmed" fw={600}>
            {getMediaSourceLabel(media.source)}
          </Text>

          <Paper
            p="sm"
            radius="sm"
            bg="var(--mantine-color-accent-1)"
            style={{
              borderLeft: "3px solid var(--mantine-color-accent-6)",
            }}
          >
            <Group gap={6} align="flex-start" wrap="nowrap">
              <IconSparkles
                size={15}
                aria-hidden
                style={{
                  marginTop: 2,
                  color: "var(--mantine-color-accent-7)",
                  flexShrink: 0,
                }}
              />
              <Text size="sm" fw={600} lh={1.4}>
                {recommendation.reason}
              </Text>
            </Group>
          </Paper>

          <Button
            mt="auto"
            variant="light"
            leftSection={<IconPlus size={17} />}
            onClick={() => onAdd({ id: "", ...media })}
            fullWidth
          >
            Add to library
          </Button>
          <Button
            variant="subtle"
            color="gray"
            onClick={() => onDismiss(media)}
            loading={isDismissing}
            fullWidth
          >
            Dismiss
          </Button>
        </Stack>
      </Card>
    </motion.div>
  );
}

export function SystemRecommendationsPage({
  onAdd,
}: {
  onAdd: (media: SourceMediaRecord) => void;
}) {
  const reduceMotion = useAppReducedMotion();
  const queryClient = useQueryClient();
  const { data, error, isError, isFetching, refetch } = useQuery(
    systemRecommendationPreviewOptions,
  );
  const dismissMutation = useMutation({
    mutationFn: dismissSystemRecommendation,
    onSuccess: (_, input) => {
      queryClient.setQueryData<SystemRecommendationPreviewResponse>(
        queryKeys.recommendations.preview,
        (current) =>
          current
            ? {
                ...current,
                recommendations: current.recommendations.filter(
                  ({ media }) =>
                    media.source !== input.source ||
                    media.externalId !== input.externalId,
                ),
              }
            : current,
      );
    },
    onError: (dismissError) => {
      showErrorNotification({
        title: "Could not dismiss recommendation",
        message: getApiErrorMessage(dismissError),
      });
    },
  });
  const isFirstGeneration = isFetching && !data;
  const contributingSeedCount = data
    ? new Set(
        data.recommendations.flatMap(
          (recommendation) => recommendation.seedUserMediaIds,
        ),
      ).size
    : 0;

  return (
    <Container
      size="xl"
      py={{ base: "md", sm: "xl" }}
      px={{ base: "xs", sm: "md" }}
    >
      <motion.div
        variants={pageStaggerVariants(reduceMotion)}
        initial="hidden"
        animate="visible"
      >
        <Stack gap="lg">
          <Group justify="space-between" align="flex-end" gap="md">
            <Stack gap={4}>
              <Text
                size="xs"
                fw={700}
                c="primary"
                tt="uppercase"
                style={{ letterSpacing: "0.1em" }}
              >
                Chosen from your journey
              </Text>
              <Title order={1} fz={{ base: "h2", sm: "h1" }}>
                Recommendations
              </Title>
              <Text c="dimmed" maw={620}>
                Generate a fresh list from media you completed, revisited,
                favorited, or rated highly. Nothing runs until you ask for it.
              </Text>
            </Stack>

            <Button
              leftSection={<IconSparkles size={18} />}
              loading={isFetching}
              disabled={isFetching}
              onClick={() => void refetch()}
              w={{ base: "100%", xs: "auto" }}
            >
              {isError && !data
                ? "Try again"
                : data
                  ? "Generate again"
                  : "Generate recommendations"}
            </Button>
          </Group>

          {isError && (
            <Alert
              color="red"
              title="Recommendations could not be generated"
              icon={<IconAlertCircle size={18} />}
            >
              {getApiErrorMessage(error)}
              {data && " Your last successful list is still available below."}
            </Alert>
          )}

          {!data && !isFirstGeneration && !isError && (
            <EmptyState
              icon={<IconSparkles size={34} />}
              title="Find your next story"
              description="Generate recommendations when you are ready. Your completed, revisited, favorite, and highly rated media provide the starting points."
            />
          )}

          {isFirstGeneration && (
            <SimpleGrid cols={{ base: 1, xs: 2, md: 3, lg: 4 }}>
              {Array.from({ length: 8 }, (_, index) => (
                <MediaCardSkeleton key={index} />
              ))}
            </SimpleGrid>
          )}

          {data && data.eligibleSeedCount === 0 && (
            <EmptyState
              icon={<IconBooks size={34} />}
              title="Your library needs a few signals"
              description="Complete or revisit media, mark favorites, or rate something 7/10 or higher, then generate again."
            />
          )}

          {data &&
            data.eligibleSeedCount > 0 &&
            data.recommendations.length === 0 && (
              <EmptyState
                icon={<IconSparkles size={34} />}
                title="No suggestions this time"
                description="Your library has suitable starting points, but the providers did not return usable recommendations. Try generating again."
              />
            )}

          {data && data.recommendations.length > 0 && (
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Based on {contributingSeedCount}{" "}
                {contributingSeedCount === 1 ? "title" : "titles"} from your
                library.
              </Text>
              <SimpleGrid
                spacing={{ base: "sm", md: "lg" }}
                verticalSpacing={{ base: "md", md: "xl" }}
                cols={{ base: 1, xs: 2, md: 3, lg: 4 }}
              >
                {data.recommendations.map((recommendation) => (
                  <RecommendationCard
                    key={`${recommendation.media.source}:${recommendation.media.externalId}`}
                    recommendation={recommendation}
                    onAdd={onAdd}
                    onDismiss={(media) =>
                      dismissMutation.mutate({
                        source: media.source,
                        externalId: media.externalId,
                      })
                    }
                    isDismissing={
                      dismissMutation.isPending &&
                      dismissMutation.variables?.source ===
                        recommendation.media.source &&
                      dismissMutation.variables?.externalId ===
                        recommendation.media.externalId
                    }
                  />
                ))}
              </SimpleGrid>
            </Stack>
          )}
        </Stack>
      </motion.div>
    </Container>
  );
}
