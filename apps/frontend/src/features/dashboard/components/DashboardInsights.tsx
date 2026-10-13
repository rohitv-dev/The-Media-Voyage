import { BarChart } from "@mantine/charts";
import {
  Card,
  Grid,
  Group,
  NativeSelect,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import type { DashboardStatsResponse } from "@media-voyage/shared/api";
import type { MediaType, Status } from "@media-voyage/shared/userMediaSchema";
import { capitalizeWords, formatMonthLabel } from "#/utils/strings";
import { DashboardAnimatedCard } from "./DashboardAnimatedCard";
import { TimeSpentCard } from "./TimeSpentCard";
import { getTypeColor } from "#/features/media/display";

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
  const currentYear = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from(
    new Set([
      currentYear,
      ...data.addedTrend.map((row) => row.month.slice(0, 4)),
      ...data.completionTrend.map((row) => row.month.slice(0, 4)),
    ]),
  ).sort((a, b) => Number(b) - Number(a));
  const year = years.includes(selectedYear) ? selectedYear : currentYear;
  const monthlyTrends = Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    const completed = data.completionTrend.find((row) => row.month === month);

    return {
      month: formatMonthLabel(month),
      added: data.addedTrend.find((row) => row.month === month)?.count ?? 0,
      completed: completed?.count ?? 0,
      movie: completed?.movie ?? 0,
      show: completed?.show ?? 0,
      book: completed?.book ?? 0,
      game: completed?.game ?? 0,
    };
  });

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
      <Group justify="space-between" align="end">
        <Title order={3}>Insights</Title>
        <NativeSelect
          label="Trend Year"
          data={years}
          value={year}
          onChange={(event) => setSelectedYear(event.currentTarget.value)}
          size="xs"
          w={110}
        />
      </Group>
      <Grid gap={{ base: "sm", sm: "md" }}>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <TimeSpentCard timeSpent={data.timeSpent} isMobile={isMobile} />
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <DashboardAnimatedCard>
            <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }} h="100%">
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
            <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }} h="100%">
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
            <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }} h="100%">
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
            <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }} h="100%">
              <Stack gap="sm">
                <Title order={4}>Added vs Completed</Title>
                <Text size="sm" c="dimmed">
                  Library additions by date added, compared with recorded
                  completions. Excludes trashed entries.
                </Text>
                {monthlyTrends.some((row) => row.added || row.completed) ? (
                  <BarChart
                    h={barChartHeight}
                    data={monthlyTrends}
                    dataKey="month"
                    series={[
                      { name: "added", label: "Added", color: "blue.6" },
                      {
                        name: "completed",
                        label: "Completed",
                        color: "green.6",
                      },
                    ]}
                    withLegend
                    xAxisProps={{
                      tickFormatter: (value) => String(value).slice(0, 3),
                    }}
                    yAxisProps={{ allowDecimals: false }}
                  />
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    No additions or completions recorded in {year}.
                  </Text>
                )}
              </Stack>
            </Card>
          </DashboardAnimatedCard>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <DashboardAnimatedCard>
            <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }} h="100%">
              <Stack gap="sm">
                <Title order={4}>Completion Trend</Title>
                <Text size="sm" c="dimmed">
                  Monthly completions by media type and recorded completion
                  date.
                </Text>
                {monthlyTrends.some((row) => row.completed > 0) ? (
                  <BarChart
                    h={barChartHeight}
                    data={monthlyTrends}
                    dataKey="month"
                    type="stacked"
                    series={(["movie", "show", "book", "game"] as const).map(
                      (type) => ({
                        name: type,
                        label: `${capitalizeWords(type)}s`,
                        color: `${getTypeColor(type)}.6`,
                      }),
                    )}
                    withLegend
                    xAxisProps={{
                      tickFormatter: (value) => String(value).slice(0, 3),
                    }}
                    yAxisProps={{ allowDecimals: false }}
                  />
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="xl">
                    No completions recorded in {year}.
                  </Text>
                )}
              </Stack>
            </Card>
          </DashboardAnimatedCard>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
