import { useLocalStorage } from "@mantine/hooks";

export type CoverArtSize = "full" | "large" | "medium" | "small";

export const COVER_ART_SIZE_RATIOS: Record<CoverArtSize, number> = {
  full: 2 / 3,
  large: 4 / 5,
  medium: 1,
  small: 4 / 3,
};

const STORAGE_KEY = "media-voyage-cover-art-size";

/** Poster aspect ratios for media cards, persisted per device. */
export function useCoverArtSizePreference() {
  return useLocalStorage<CoverArtSize>({
    key: STORAGE_KEY,
    defaultValue: "full",
  });
}
