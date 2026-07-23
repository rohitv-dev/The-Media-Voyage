import { useLocalStorage } from "@mantine/hooks";
import { useEffect } from "react";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";

export type FilterPreset = {
  id: string;
  name: string;
  filters: UserMediaQuerySchema;
  createdAt: string;
};

const STORAGE_KEY = "media-filter-presets";
const SEEDED_KEY = "media-filter-presets-seeded";
const MAX_PRESETS = 20;

type SaveResult = { ok: true } | { ok: false; error: string };

const DEFAULT_PRESETS: Array<Pick<FilterPreset, "name" | "filters">> = [
  {
    name: "In Progress",
    filters: { status: ["in_progress"], sort: "updatedAt", order: "desc" },
  },
  {
    name: "Plan to Watch",
    filters: { status: ["planned"], sort: "updatedAt", order: "desc" },
  },
  {
    name: "Completed",
    filters: { status: ["completed"], sort: "updatedAt", order: "desc" },
  },
  {
    name: "On Hold",
    filters: { status: ["on_hold"], sort: "updatedAt", order: "desc" },
  },
  {
    name: "Dropped",
    filters: { status: ["dropped"], sort: "updatedAt", order: "desc" },
  },
  {
    name: "Favorites",
    filters: { favorite: true, sort: "updatedAt", order: "desc" },
  },
  {
    name: "Highly Rated",
    filters: { minRating: 8, sort: "rating", order: "desc" },
  },
];

export function useFilterPresets() {
  const [presets, setPresets] = useLocalStorage<FilterPreset[]>({
    key: STORAGE_KEY,
    defaultValue: [],
  });

  const [seeded, setSeeded] = useLocalStorage<boolean>({
    key: SEEDED_KEY,
    defaultValue: false,
  });

  useEffect(() => {
    if (seeded) return;

    setPresets((prev) => [
      ...prev,
      ...DEFAULT_PRESETS.map((preset) => ({
        ...preset,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      })),
    ]);
    setSeeded(true);
  }, [seeded, setPresets, setSeeded]);

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
