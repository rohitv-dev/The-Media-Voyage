import { useLocalStorage } from "@mantine/hooks";

const STORAGE_KEY = "media-voyage-reduce-motion";

/**
 * Explicit in-app "reduce motion" toggle, independent of the OS-level
 * prefers-reduced-motion setting. Persisted per-device.
 *
 * `getInitialValueInEffect: false` so the very first render already reflects
 * the saved value — otherwise mount animations (which fire immediately) would
 * always play at full motion for one frame before the effect-based default
 * corrected itself, defeating the whole point of the setting.
 */
export function useReducedMotionPreference() {
  return useLocalStorage<boolean>({
    key: STORAGE_KEY,
    defaultValue: false,
    getInitialValueInEffect: false,
  });
}
