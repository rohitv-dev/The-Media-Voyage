import { useLocalStorage } from "@mantine/hooks";

export function useCharacterShortcutsPreference() {
  return useLocalStorage<boolean>({
    key: "media-voyage-single-letter-shortcuts",
    defaultValue: true,
    getInitialValueInEffect: false,
  });
}
