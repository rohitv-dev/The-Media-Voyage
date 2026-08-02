import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { DashboardStatsResponse } from "@media-voyage/shared/api";
import { DashboardAnimatedCard } from "./DashboardAnimatedCard";
import { capitalizeWords } from "#/utils/strings";

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
    <DashboardAnimatedCard>
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
    </DashboardAnimatedCard>
  );
}

export function DashboardOverview({
  summary,
  onStatClick,
}: {
  summary: DashboardStatsResponse["summary"];
  onStatClick: (key: keyof DashboardStatsResponse["summary"]) => void;
}) {
  return (
    <Stack gap="sm">
      <Title order={3}>Overview</Title>
      <SimpleGrid
        cols={{ base: 2, xs: 3, md: 4, lg: 6 }}
        spacing={{ base: "xs", sm: "md" }}
      >
        {Object.entries(summary).map(([type, value]) => (
          <StatCard
            key={type}
            label={capitalizeWords(type)}
            value={value}
            onClick={() => onStatClick(type as keyof typeof summary)}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
