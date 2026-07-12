import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  DataList,
} from "@mantine/core";
import type { MediaDetailedRecord } from "@media-voyage/shared/api";
import { useNavigate } from "@tanstack/react-router";

const formatDate = (value?: Date | undefined | null) =>
  value ? new Date(value).toLocaleDateString() : "-";

const formatValue = (value?: string | number | null) =>
  value === undefined || value === null || value === "" ? "-" : value;

const renderListItems = ({
  items,
  orientation,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
  orientation?: "horizontal" | "vertical";
}) => (
  <DataList
    orientation={orientation}
    style={{
      justifyContent: orientation === "horizontal" ? "space-between" : "",
    }}
  >
    {items.map((item) => (
      <DataList.Item
        key={item.label}
        style={{
          justifyContent:
            item.value != null &&
            item.value.toString().length > 50 &&
            !orientation
              ? "flex-start"
              : "space-between",
          flexWrap: "wrap",
        }}
      >
        <DataList.ItemLabel>{item.label}</DataList.ItemLabel>
        <DataList.ItemValue fw="500">{item.value}</DataList.ItemValue>
      </DataList.Item>
    ))}
  </DataList>
);

function StatCard({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <Card
      withBorder
      p="lg"
      h="100%"
      style={{
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {label}
        </Text>

        <Text fw={600}>{formatValue(value)}</Text>
      </Stack>
    </Card>
  );
}

export function MediaView({ data }: { data: MediaDetailedRecord }) {
  const navigate = useNavigate();

  const mediaDetails = [
    { label: "Title", value: data.title },
    { label: "Type", value: capitalizeWords(data.type) },
    {
      label: "Visibility",
      value: data.visibility ? capitalizeWords(data.visibility) : "-",
    },
    { label: "Source", value: data.source || "-" },
  ];

  const trackingDetails = [
    { label: "Started", value: formatDate(data.startedAt) },
    { label: "Completed", value: formatDate(data.completedAt) },
    { label: "Rewatches", value: data.rewatches },
  ];

  return (
    <Container size="lg" py="lg">
      <Stack gap="xs">
        <Card withBorder p="lg" shadow="sm">
          <Group justify="space-between" align="flex-start">
            <Stack gap="sm" maw={900}>
              <Group justify="space-between" align="flex-start">
                <Stack gap="1px">
                  <Title order={2}>{data.title}</Title>
                  <Text c="dimmed" size="sm">
                    {data.description ||
                      "No description available for this media item."}
                  </Text>
                </Stack>

                <Button
                  size="xs"
                  variant="gradient"
                  gradient={{ from: "blue", to: "cyan" }}
                  onClick={() =>
                    navigate({
                      to: "/media/update/$id",
                      params: { id: data.id },
                    })
                  }
                >
                  Update Media
                </Button>
              </Group>

              <Group gap="xs">
                <Badge variant="light">{capitalizeWords(data.type)}</Badge>

                {data.visibility && (
                  <Badge variant="outline">
                    {capitalizeWords(data.visibility)}
                  </Badge>
                )}

                {data.favorite && <Badge color="yellow">★ Favorite</Badge>}
              </Group>

              {data.tags && data.tags.length > 0 && (
                <Group gap="xs">
                  {data.tags.map((tag) => (
                    <Badge key={tag} radius="xl" variant="dot" color="gray">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
          </Group>
        </Card>

        {/* Stats */}
        <SimpleGrid cols={{ base: 2, md: 4 }}>
          <StatCard label="Status" value={capitalizeWords(data.status)} />

          <StatCard label="Rating" value={data.rating?.toFixed(1)} />

          <StatCard label="Progress" value={`${data.progress ?? 0}%`} />

          <StatCard
            label="Time Spent"
            value={data.timeSpent ? `${data.timeSpent} min` : "-"}
          />
        </SimpleGrid>

        {/* Progress */}
        <Card withBorder p="lg">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={600}>Completion Progress</Text>

              <Text fw={700}>{data.progress ?? 0}%</Text>
            </Group>

            <Progress value={data.progress ?? 0} size="xl" radius="xl" />
          </Stack>
        </Card>

        {/* Main Info */}
        <Grid align="stretch">
          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card
              withBorder
              p="lg"
              h="100%"
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack gap="md">
                <Title order={4}>Media Details</Title>

                <Divider />

                {renderListItems({
                  items: mediaDetails,
                  orientation: "horizontal",
                })}
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 6 }}>
            <Card
              withBorder
              p="lg"
              h="100%"
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Stack gap="md">
                <Title order={4}>Tracking</Title>

                <Divider />

                {renderListItems({
                  items: trackingDetails,
                  orientation: "horizontal",
                })}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Review */}
        <Card withBorder p="lg">
          <Stack gap="md">
            <Title order={4}>Review</Title>

            <Divider />

            <Text
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
              }}
            >
              {data.review?.trim() || "No review has been added yet."}
            </Text>
          </Stack>
        </Card>

        {/* Notes */}
        <Card withBorder p="lg">
          <Stack gap="md">
            <Title order={4}>Notes</Title>

            <Divider />

            <Text
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
              }}
            >
              {data.notes?.trim() || "No notes have been added yet."}
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
