import { useLocalStorage } from "@mantine/hooks";

const STORAGE_KEY = "media-voyage-show-cover-art";

/**
 * Whether media cards should show cover/poster art. Persisted per-device.
 * `useLocalStorage` keeps every instance of this hook in sync within the tab,
 * so toggling it on the Profile page updates cards immediately elsewhere.
 */
export function useCoverArtPreference() {
  return useLocalStorage<boolean>({
    key: STORAGE_KEY,
    defaultValue: true,
  });
}
