import { BarChart } from "@mantine/charts";
import { Card, Grid, Stack, Text, Title } from "@mantine/core";
import type { DashboardStatsResponse } from "@media-voyage/shared/api";
import type { MediaType, Status } from "@media-voyage/shared/userMediaSchema";
import { capitalizeWords, formatMonthLabel } from "#/utils/strings";
import { DashboardAnimatedCard } from "./DashboardAnimatedCard";
import { TimeSpentCard } from "./TimeSpentCard";

export function DashboardInsights({
  data,
  isMobile,
  barChartHeight,
  onStatusClick,
  onRatingClick,
  onTypeClick,
}: {
  data: DashboardStatsResponse;
  isMobile: boolean;
  barChartHeight: number;
  onStatusClick: (status: Status) => void;
  onRatingClick: (rating: number) => void;
  onTypeClick: (type: MediaType) => void;
}) {
  const statusChartData = data.statusDistribution.map((val) => ({
    status: val.status,
    label: String(capitalizeWords(val.status)),
    count: val.count,
  }));

  const typeChartData = data.mediaTypeDistribution.map((val) => ({
    type: val.type,
    label: String(capitalizeWords(val.type)),
    count: val.count,
  }));

  return (
    <Stack gap="sm">
      <Title order={3}>Insights</Title>
      <Grid gap={{ base: "sm", sm: "md" }}>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TimeSpentCard timeSpent={data.timeSpent} isMobile={isMobile} />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <DashboardAnimatedCard>
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
                      onStatusClick(bar.payload.statusKey as Status),
                  }}
                />
              </Stack>
            </Card>
          </DashboardAnimatedCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <DashboardAnimatedCard>
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
                    onClick: (bar) => onRatingClick(bar.payload.rating),
                  }}
                />
              </Stack>
            </Card>
          </DashboardAnimatedCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <DashboardAnimatedCard>
            <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
              <Stack gap="sm">
                <Title order={4}>Media by Type</Title>
                <Text size="sm" c="dimmed">
                  Movies, Shows, Books and Games owned.
                </Text>
                <BarChart
                  h={barChartHeight}
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
                      onTypeClick(bar.payload.typeKey as MediaType),
                  }}
                />
              </Stack>
            </Card>
          </DashboardAnimatedCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <DashboardAnimatedCard>
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
          </DashboardAnimatedCard>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
