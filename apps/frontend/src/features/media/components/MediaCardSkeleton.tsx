import { AspectRatio, Card, Stack, Skeleton, Group } from "@mantine/core";
import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import {
  COVER_ART_SIZE_RATIOS,
  useCoverArtSizePreference,
} from "#/features/media/hooks/useCoverArtSizePreference";

export function MediaCardSkeleton() {
  const [showCoverArt] = useCoverArtPreference();
  const [coverArtSize] = useCoverArtSizePreference();

  return (
    <Card withBorder radius="md" p="md">
      <Stack>
        {showCoverArt && (
          <AspectRatio ratio={COVER_ART_SIZE_RATIOS[coverArtSize]}>
            <Skeleton animate radius="md" />
          </AspectRatio>
        )}

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
