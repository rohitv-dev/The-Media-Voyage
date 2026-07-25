import { AspectRatio, Box, Card, Image } from "@mantine/core";
import { IconPhotoOff } from "@tabler/icons-react";
import { COVER_ART_SIZE_RATIOS } from "../../hooks/useCoverArtSizePreference";
import type { CoverArtSize } from "../../hooks/useCoverArtSizePreference";

interface MediaCardCoverArtProps {
  imageUrl: string | null;
  coverArtSize: CoverArtSize;
}

export function MediaCardCoverArt({
  imageUrl,
  coverArtSize,
}: MediaCardCoverArtProps) {
  const hasImage = !!imageUrl && imageUrl !== "N/A";
  const imageObjectPosition =
    coverArtSize === "medium" || coverArtSize === "small"
      ? "center top"
      : "center";

  return (
    <Card.Section>
      <AspectRatio ratio={COVER_ART_SIZE_RATIOS[coverArtSize]}>
        {hasImage ? (
          <Image
            src={imageUrl}
            alt=""
            fit="cover"
            style={{ objectPosition: imageObjectPosition }}
          />
        ) : (
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--mantine-color-accent-1)",
            }}
          >
            <IconPhotoOff
              size={32}
              style={{
                color: "var(--mantine-color-accent-6)",
                opacity: 0.6,
              }}
            />
          </Box>
        )}
      </AspectRatio>
    </Card.Section>
  );
}
