import { Card, Stack, Skeleton, Group } from "@mantine/core";
import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";

export function MediaCardSkeleton() {
  const [showCoverArt] = useCoverArtPreference();

  return (
    <Card withBorder radius="md" p="md">
      <Stack>
        {showCoverArt && <Skeleton animate height={220} radius="md" />}

        <Skeleton animate height={20} width="70%" />
        <Skeleton animate height={14} width="40%" />

        <Group gap="xs">
          <Skeleton animate height={22} width={70} radius="xl" />
          <Skeleton animate height={22} width={90} radius="xl" />
        </Group>

        <Skeleton animate height={34} mt="sm" />
      </Stack>
    </Card>
  );
}
