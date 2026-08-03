import { Badge, Group, Image, Stack, Text, Title } from "@mantine/core";
import type { RecommendationDetail } from "@media-voyage/shared/api";
import { capitalizeWords } from "#/utils/strings";
import { getTypeColor, getTypeIcon } from "#/features/media/display";

function RecommendationStatusBadge({
  status,
}: {
  status: RecommendationDetail["status"];
}) {
  const color =
    status === "pending" ? "orange" : status === "resolved" ? "teal" : "gray";

  return (
    <Badge color={color} variant="light">
      {capitalizeWords(status)}
    </Badge>
  );
}

export function DetailMedia({ detail }: { detail: RecommendationDetail }) {
  return (
    <Group align="flex-start" wrap="nowrap" gap="md">
      <Image
        src={detail.media.imageUrl}
        alt=""
        w={76}
        h={112}
        radius="sm"
        fit="cover"
        fallbackSrc="https://placehold.co/152x224?text=No+Image"
      />
      <Stack gap={5} style={{ minWidth: 0, flex: 1 }}>
        <Group gap="xs">
          <Badge
            color={getTypeColor(detail.media.type)}
            variant="light"
            leftSection={getTypeIcon(detail.media.type)}
          >
            {capitalizeWords(detail.media.type)}
          </Badge>
          <RecommendationStatusBadge status={detail.status} />
        </Group>
        <Title order={3} lh={1.15} style={{ overflowWrap: "anywhere" }}>
          {detail.media.title}
        </Title>
        {detail.media.description && (
          <Text size="sm" c="dimmed" lineClamp={3}>
            {detail.media.description}
          </Text>
        )}
      </Stack>
    </Group>
  );
}
