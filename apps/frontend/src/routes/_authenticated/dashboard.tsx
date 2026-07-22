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
import type { Variants } from "motion/react";
import {
  continueMediaFilters,
  continueMediaQueryOptions,
  dashboardStatOptions,
} from "#/features/media/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { capitalizeWords, formatMonthLabel } from "#/utils/stringFunctions";
import { getStatusColor } from "#/features/media/functions";
import { ContinueMediaCard } from "#/features/media/components/ContinueMediaCard";
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

const pageVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

function AnimatedCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={itemVariants}
      layout
      whileHover={{
        y: -4,
        transition: {
          duration: 0.15,
        },
      }}
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
        p="md"
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
        <Stack gap={4}>
          <Text c="dimmed" size="sm">
            {label}
          </Text>

          <Title order={2}>{value}</Title>
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
    <Container size="xl" py="xl">
      <motion.div variants={pageVariants} initial="hidden" animate="visible">
        <Stack gap="xl">
          <motion.div variants={itemVariants}>
            <Group justify="space-between">
              <Title>Statistics</Title>
            </Group>
          </motion.div>

          <SimpleGrid cols={{ base: 2, md: 4, lg: 6 }}>
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

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <AnimatedCard>
                <Card withBorder radius="md" p="lg">
                  <Stack>
                    <Title order={4}>Status Distribution</Title>

                    <Text size="sm" c="dimmed">
                      Percentage of media in each status.
                    </Text>

                    <Center h={320}>
                      <PieChart
                        size={220}
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
                <Card withBorder radius="md" p="lg">
                  <Stack>
                    <Title order={4}>Media by Status</Title>

                    <Text size="sm" c="dimmed">
                      Number of entries for each status.
                    </Text>

                    <BarChart
                      h={320}
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
                <Card withBorder radius="md" p="lg">
                  <Stack>
                    <Title order={4}>Media by Type</Title>

                    <Text size="sm" c="dimmed">
                      Movies, Shows, Books and Games owned.
                    </Text>

                    <BarChart
                      h={350}
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
                <Card withBorder radius="md" p="lg">
                  <Stack>
                    <Title order={4}>Ratings Distribution</Title>

                    <Text size="sm" c="dimmed">
                      Number of entries in each rating bucket.
                    </Text>

                    <BarChart
                      h={300}
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
                <Card withBorder radius="md" p="lg">
                  <Stack>
                    <Title order={4}>Completion Trend</Title>

                    <Text size="sm" c="dimmed">
                      Completed media over time.
                    </Text>

                    <BarChart
                      h={300}
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

          <motion.div variants={itemVariants}>
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
                <Card withBorder radius="md" p="xl">
                  <Stack align="center" gap="xs">
                    <IconPlayerPlay size={32} />
                    <Text fw={600}>Nothing in progress</Text>
                    <Text c="dimmed" size="sm" ta="center">
                      Start or resume something from your library to see it
                      here.
                    </Text>
                  </Stack>
                </Card>
              ) : (
                <SimpleGrid
                  spacing="sm"
                  cols={{ base: 2, sm: 3, md: 4, lg: 6 }}
                >
                  <AnimatePresence mode="popLayout">
                    {continueItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          duration: 0.2,
                          layout: { duration: 0.25 },
                        }}
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
