import { createFileRoute } from "@tanstack/react-router";
import { BarChart, PieChart } from "@mantine/charts";
import {
  Card,
  Container,
  Grid,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { dashboardStatOptions } from "#/features/media/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { capitalizeWords } from "#/utils/stringFunctions";
import { getStatusColor } from "#/features/media/functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(dashboardStatOptions);
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <AnimatedCard>
      <Card withBorder radius="md" p="md">
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
  const { data } = useSuspenseQuery(dashboardStatOptions);

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

                    <PieChart
                      h={320}
                      data={data.statusDistribution.map((val) => ({
                        name: String(capitalizeWords(val.status)),
                        value: val.count,
                        color: getStatusColor(val.status),
                      }))}
                      withLabels
                      withTooltip
                    />
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
                      data={data.statusDistribution.map((val) => ({
                        status: capitalizeWords(val.status),
                        count: val.count,
                      }))}
                      dataKey="status"
                      series={[{ name: "count", color: "blue.6" }]}
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
                      data={data.mediaTypeDistribution.map((val) => ({
                        type: capitalizeWords(val.type),
                        count: val.count,
                      }))}
                      dataKey="type"
                      series={[{ name: "count", color: "violet.6" }]}
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
                        month: val.month,
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
        </Stack>
      </motion.div>
    </Container>
  );
}
