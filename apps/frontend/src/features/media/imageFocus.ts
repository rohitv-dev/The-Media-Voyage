import type { MediaImageFocus } from "@media-voyage/shared/api";
import type { CoverArtSize } from "./hooks/useCoverArtSizePreference";

export type ImageFocusPoint = {
  x: number;
  y: number;
};

export function getDefaultImageFocus(
  coverArtSize: CoverArtSize,
): ImageFocusPoint {
  return {
    x: 0.5,
    y: coverArtSize === "medium" || coverArtSize === "small" ? 0 : 0.5,
  };
}

export function getImageObjectPosition(
  coverArtSize: CoverArtSize,
  focus: MediaImageFocus,
): string {
  const point =
    focus.imageFocusX !== null && focus.imageFocusY !== null
      ? { x: focus.imageFocusX, y: focus.imageFocusY }
      : getDefaultImageFocus(coverArtSize);

  return `${point.x * 100}% ${point.y * 100}%`;
}
