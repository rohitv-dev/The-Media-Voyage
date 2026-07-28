import { AspectRatio, Box, Image, Skeleton } from "@mantine/core";
import { IconPhotoOff } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { COVER_ART_SIZE_RATIOS } from "../../hooks/useCoverArtSizePreference";
import type { CoverArtSize } from "../../hooks/useCoverArtSizePreference";
import { getImageObjectPosition } from "../../imageFocus";

interface MediaCardCoverArtProps {
  imageUrl: string | null;
  coverArtSize: CoverArtSize;
  imageFocusX: number | null;
  imageFocusY: number | null;
}

export function MediaCardCoverArt({
  imageUrl,
  coverArtSize,
  imageFocusX,
  imageFocusY,
}: MediaCardCoverArtProps) {
  const hasImage = !!imageUrl && imageUrl !== "N/A";
  const [imageStatus, setImageStatus] = useState<
    "loading" | "loaded" | "error"
  >(hasImage ? "loading" : "error");

  useEffect(() => {
    setImageStatus(hasImage ? "loading" : "error");
  }, [hasImage, imageUrl]);

  const showFallback = !hasImage || imageStatus === "error";
  const imageObjectPosition = getImageObjectPosition(coverArtSize, {
    imageFocusX,
    imageFocusY,
  });

  return (
    <AspectRatio ratio={COVER_ART_SIZE_RATIOS[coverArtSize]}>
      {!showFallback ? (
        <Skeleton visible={imageStatus === "loading"} radius={0}>
          <Image
            src={imageUrl}
            alt=""
            h="100%"
            fit="cover"
            onLoad={() => setImageStatus("loaded")}
            onError={() => setImageStatus("error")}
            style={{
              objectPosition: imageObjectPosition,
              opacity: imageStatus === "loaded" ? 1 : 0,
              transition: "opacity 180ms ease",
            }}
          />
        </Skeleton>
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
  );
}
