import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BarChart, PieChart } from "@mantine/charts";
import {
  Button,
  Card,
  Center,
  Container,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { AnimatePresence, motion } from "motion/react";
import { useMediaQuery } from "@mantine/hooks";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import {
  fadeUpVariants,
  gridItemMotionProps,
  pageStaggerVariants,
} from "#/theme/motion";
import {
  continueMediaFilters,
  continueMediaQueryOptions,
  dashboardStatOptions,
} from "#/features/media/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { capitalizeWords, formatMonthLabel } from "#/utils/strings";
import { getStatusColor } from "#/features/media/display";
import { ContinueMediaCard } from "#/features/media/components/ContinueMediaCard";
import { EmptyState } from "#/components/EmptyState";
import { IconArrowRight, IconPlayerPlay } from "@tabler/icons-react";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import type { MediaType, Status } from "@media-voyage/shared/userMediaSchema";

function statusFilters(status: Status): UserMediaQuerySchema {
  return { status: [status], sort: "updatedAt", order: "desc" };
}

function typeFilters(type: MediaType): UserMediaQuerySchema {
  return { type: [type], sort: "updatedAt", order: "desc" };
}

function ratingFilters(rating: number): UserMediaQuerySchema {
  return {
    minRating: rating,
    maxRating: rating,
    sort: "updatedAt",
    order: "desc",
  };
}

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(dashboardStatOptions);
    queryClient.ensureQueryData(continueMediaQueryOptions);
  },
  component: RouteComponent,
});

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const reduceMotion = useAppReducedMotion();

  return (
    <motion.div
      variants={fadeUpVariants(reduceMotion)}
      layout={!reduceMotion}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -4,
              transition: {
                duration: 0.15,
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number | string;
  onClick?: () => void;
}) {
  return (
    <AnimatedCard>
      <Card
        withBorder
        radius="md"
        p={{ base: "xs", sm: "md" }}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        style={onClick ? { cursor: "pointer" } : undefined}
      >
        <Stack gap={2}>
          <Text c="dimmed" size="xs" truncate>
            {label}
          </Text>

          <Title order={3} fz={{ base: "h4", sm: "h2" }}>
            {value}
          </Title>
        </Stack>
      </Card>
    </AnimatedCard>
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(dashboardStatOptions);
  const { data: continueData } = useSuspenseQuery(continueMediaQueryOptions);
  const continueItems = continueData.data.slice(0, 6);
  const reduceMotion = useAppReducedMotion();
  const isMobile = useMediaQuery("(max-width: 36em)");
  const pieChartSize = isMobile ? 160 : 220;
  const barChartHeight = isMobile ? 220 : 320;
  const typeBarChartHeight = isMobile ? 240 : 350;

  const statusChartData = data.statusDistribution.map((val) => ({
    status: val.status,
    label: String(capitalizeWords(val.status)),
    count: val.count,
    color: getStatusColor(val.status),
  }));

  const typeChartData = data.mediaTypeDistribution.map((val) => ({
    type: val.type,
    label: String(capitalizeWords(val.type)),
    count: val.count,
  }));

  const goToLibrary = (search?: UserMediaQuerySchema) =>
    navigate({ to: "/media", search });

  const handleStatClick = (key: keyof typeof data.summary) => {
    if (key === "collections") {
      navigate({ to: "/collection" });
      return;
    }

    goToLibrary(key === "total_media" ? undefined : statusFilters(key));
  };

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
        <Stack gap="md">
          <motion.div variants={fadeUpVariants(reduceMotion)}>
            <Group justify="space-between">
              <Title order={2} fz={{ base: "h3", sm: "h1" }}>
                Statistics
              </Title>
            </Group>
          </motion.div>

          <SimpleGrid
            cols={{ base: 2, xs: 3, md: 4, lg: 6 }}
            spacing={{ base: "xs", sm: "md" }}
          >
            {Object.entries(data.summary).map(([type, value]) => (
              <StatCard
                key={type}
                label={capitalizeWords(type)}
                value={value}
                onClick={() =>
                  handleStatClick(type as keyof typeof data.summary)
                }
              />
            ))}
          </SimpleGrid>

          <Grid gap={{ base: "sm", sm: "md" }}>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <AnimatedCard>
                <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
                  <Stack gap="sm">
                    <Title order={4}>Status Distribution</Title>

                    <Text size="sm" c="dimmed">
                      Percentage of media in each status.
                    </Text>

                    <Center h={barChartHeight}>
                      <PieChart
                        size={pieChartSize}
                        data={statusChartData.map((item) => ({
                          key: item.status,
                          name: item.label,
                          value: item.count,
                          color: item.color,
                        }))}
                        withLabels
                        withLabelsLine
                        labelsType="name"
                        withTooltip
                        cellProps={(series) => ({
                          style: { cursor: "pointer" },
                          onClick: () =>
                            goToLibrary(statusFilters(series.key as Status)),
                        })}
                      />
                    </Center>
                  </Stack>
                </Card>
              </AnimatedCard>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <AnimatedCard>
                <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
                  <Stack gap="sm">
                    <Title order={4}>Media by Status</Title>

                    <Text size="sm" c="dimmed">
                      Number of entries for each status.
                    </Text>

                    <BarChart
                      h={barChartHeight}
                      data={statusChartData.map((item) => ({
                        status: item.label,
                        count: item.count,
                        statusKey: item.status,
                      }))}
                      dataKey="status"
                      series={[{ name: "count", color: "blue.6" }]}
                      barProps={{
                        style: { cursor: "pointer" },
                        onClick: (bar) =>
                          goToLibrary(
                            statusFilters(bar.payload.statusKey as Status),
                          ),
                      }}
                    />
                  </Stack>
                </Card>
              </AnimatedCard>
            </Grid.Col>

            <Grid.Col span={12}>
              <AnimatedCard>
                <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
                  <Stack gap="sm">
                    <Title order={4}>Media by Type</Title>

                    <Text size="sm" c="dimmed">
                      Movies, Shows, Books and Games owned.
                    </Text>

                    <BarChart
                      h={typeBarChartHeight}
                      data={typeChartData.map((item) => ({
                        type: item.label,
                        count: item.count,
                        typeKey: item.type,
                      }))}
                      dataKey="type"
                      series={[{ name: "count", color: "violet.6" }]}
                      barProps={{
                        style: { cursor: "pointer" },
                        onClick: (bar) =>
                          goToLibrary(
                            typeFilters(bar.payload.typeKey as MediaType),
                          ),
                      }}
                    />
                  </Stack>
                </Card>
              </AnimatedCard>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <AnimatedCard>
                <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
                  <Stack gap="sm">
                    <Title order={4}>Ratings Distribution</Title>

                    <Text size="sm" c="dimmed">
                      Number of entries in each rating bucket.
                    </Text>

                    <BarChart
                      h={barChartHeight}
                      data={data.ratingDistribution.map((val) => ({
                        rating: val.rating,
                        count: val.count,
                      }))}
                      dataKey="rating"
                      series={[{ name: "count", color: "orange.6" }]}
                      barProps={{
                        style: { cursor: "pointer" },
                        onClick: (bar) =>
                          goToLibrary(ratingFilters(bar.payload.rating)),
                      }}
                    />
                  </Stack>
                </Card>
              </AnimatedCard>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <AnimatedCard>
                <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
                  <Stack gap="sm">
                    <Title order={4}>Completion Trend</Title>

                    <Text size="sm" c="dimmed">
                      Completed media over time.
                    </Text>

                    <BarChart
                      h={barChartHeight}
                      data={data.completionTrend.map((val) => ({
                        month: formatMonthLabel(val.month),
                        count: val.count,
                      }))}
                      dataKey="month"
                      series={[{ name: "count", color: "green.6" }]}
                    />
                  </Stack>
                </Card>
              </AnimatedCard>
            </Grid.Col>
          </Grid>

          <motion.div variants={fadeUpVariants(reduceMotion)}>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Title order={4}>Continue</Title>
                <Button
                  variant="subtle"
                  size="sm"
                  rightSection={<IconArrowRight size={15} />}
                  onClick={() =>
                    navigate({ to: "/media", search: continueMediaFilters })
                  }
                >
                  View all
                </Button>
              </Group>

              {continueItems.length === 0 ? (
                <EmptyState
                  radius="md"
                  icon={<IconPlayerPlay size={32} />}
                  title="Nothing in progress"
                  description="Start or resume something from your library to see it here."
                />
              ) : (
                <SimpleGrid
                  spacing={{ base: "xs", sm: "sm" }}
                  cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
                >
                  <AnimatePresence mode="popLayout">
                    {continueItems.map((item) => (
                      <motion.div
                        key={item.id}
                        {...gridItemMotionProps(reduceMotion)}
                      >
                        <ContinueMediaCard
                          media={item}
                          onView={(id) =>
                            navigate({
                              to: "/media/view/$id",
                              params: { id },
                              viewTransition: true,
                            })
                          }
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SimpleGrid>
              )}
            </Stack>
          </motion.div>
        </Stack>
      </motion.div>
    </Container>
  );
}
