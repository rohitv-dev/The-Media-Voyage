import { useLocalStorage } from "@mantine/hooks";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";

export type FilterPreset = {
  id: string;
  name: string;
  filters: UserMediaQuerySchema;
  createdAt: string;
};

const STORAGE_KEY = "media-filter-presets";
const MAX_PRESETS = 20;

type SaveResult = { ok: true } | { ok: false; error: string };

export function useFilterPresets() {
  const [presets, setPresets] = useLocalStorage<FilterPreset[]>({
    key: STORAGE_KEY,
    defaultValue: [],
  });

  const savePreset = (
    name: string,
    filters: UserMediaQuerySchema,
  ): SaveResult => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { ok: false, error: "Enter a name for this preset" };
    }

    if (
      presets.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      return {
        ok: false,
        error: `A preset named "${trimmedName}" already exists`,
      };
    }

    if (presets.length >= MAX_PRESETS) {
      return {
        ok: false,
        error: `Maximum of ${MAX_PRESETS} presets reached — delete one first`,
      };
    }

    setPresets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmedName,
        filters,
        createdAt: new Date().toISOString(),
      },
    ]);

    return { ok: true };
  };

  const deletePreset = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  return { presets, savePreset, deletePreset };
}
