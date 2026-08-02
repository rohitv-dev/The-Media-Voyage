import { DonutChart } from "@mantine/charts";
import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useState } from "react";
import type { DashboardStatsResponse } from "@media-voyage/shared/api";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import { formatDuration } from "#/features/media/formatDuration";
import { getTypeColor } from "#/features/media/display";
import { capitalizeWords } from "#/utils/strings";
import { DashboardAnimatedCard } from "./DashboardAnimatedCard";

type TimeSpentFilter = "all" | MediaType;

const timeSpentTypeOrder: MediaType[] = ["movie", "show", "book", "game"];

export function TimeSpentCard({
  timeSpent,
  isMobile,
}: {
  timeSpent: DashboardStatsResponse["timeSpent"];
  isMobile: boolean;
}) {
  const [selectedType, setSelectedType] = useState<TimeSpentFilter>("all");
  const rows = timeSpent.byType.filter((row) => row.minutes > 0);
  const availableTypes = timeSpentTypeOrder.filter((type) =>
    rows.some((row) => row.type === type),
  );
  const activeType =
    selectedType !== "all" && !availableTypes.includes(selectedType)
      ? "all"
      : selectedType;
  const selectedRow = rows.find((row) => row.type === activeType);
  const selectedMinutes =
    activeType === "all" ? timeSpent.totalMinutes : (selectedRow?.minutes ?? 0);

  const chartData = rows.map((row) => ({
    name: capitalizeWords(row.type),
    value: row.minutes,
    color: `${getTypeColor(row.type)}.6`,
  }));

  return (
    <DashboardAnimatedCard>
      <Card withBorder radius="md" p={{ base: "sm", sm: "lg" }}>
        <Stack gap="sm">
          <div>
            <Title order={4}>Time spent</Title>
            <Text size="sm" c="dimmed">
              Recorded time across your active library.
            </Text>
          </div>

          {rows.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No time recorded yet.
            </Text>
          ) : (
            <>
              <Group
                gap="xs"
                wrap="wrap"
                role="group"
                aria-label="Filter time spent by media type"
              >
                <Button
                  size="compact-sm"
                  variant={activeType === "all" ? "light" : "subtle"}
                  color="accent"
                  aria-pressed={activeType === "all"}
                  onClick={() => setSelectedType("all")}
                >
                  {capitalizeWords("all")}
                </Button>
                {availableTypes.map((type) => (
                  <Button
                    key={type}
                    size="compact-sm"
                    variant={activeType === type ? "light" : "subtle"}
                    color="accent"
                    aria-pressed={activeType === type}
                    onClick={() => setSelectedType(type)}
                  >
                    {capitalizeWords(type)}
                  </Button>
                ))}
              </Group>

              <Stack align="center" gap="xs">
                <DonutChart
                  size={isMobile ? 220 : 260}
                  thickness={isMobile ? 28 : 34}
                  paddingAngle={2}
                  data={chartData}
                  chartLabel={formatDuration(selectedMinutes)}
                  tooltipDataSource="segment"
                  valueFormatter={formatDuration}
                  aria-label={`Time spent for ${capitalizeWords(activeType)}: ${formatDuration(selectedMinutes)}`}
                  cellProps={(cell) => ({
                    opacity:
                      activeType === "all" ||
                      cell.name === capitalizeWords(activeType)
                        ? 1
                        : 0.22,
                  })}
                />
                <Text size="xs" c="dimmed">
                  {capitalizeWords(activeType)}
                </Text>
              </Stack>
            </>
          )}
        </Stack>
      </Card>
    </DashboardAnimatedCard>
  );
}
