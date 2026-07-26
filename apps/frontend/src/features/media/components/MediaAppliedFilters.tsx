import { Group, Pill } from "@mantine/core";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { capitalizeWords } from "#/utils/stringFunctions";
import { useSourceColorMap } from "#/features/sources/queries";
import { useTagColorMap } from "#/features/tags/queries";
import dayjs from "dayjs";
import type { ReactNode } from "react";

type MediaAppliedFiltersProps = {
  filters: UserMediaQuerySchema;
  updateAndApplyFilters: (filters: UserMediaQuerySchema) => void;
};

function removeArrayValue<T>(values: T[] | undefined, value: T) {
  return values?.filter((currentValue) => currentValue !== value) ?? [];
}

function FilterPill({
  bg = "grape",
  onRemove,
  children,
}: {
  bg?: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <Pill bg={bg} c="white" fw="bold" withRemoveButton onRemove={onRemove}>
      {children}
    </Pill>
  );
}

export function MediaAppliedFilters({
  filters,
  updateAndApplyFilters,
}: MediaAppliedFiltersProps) {
  const sourceColorMap = useSourceColorMap();
  const tagColorMap = useTagColorMap();

  return (
    <Group gap="xs">
      {filters.search && (
        <FilterPill
          onRemove={() =>
            updateAndApplyFilters({ ...filters, search: undefined })
          }
        >
          Search: {filters.search}
        </FilterPill>
      )}
      {filters.favorite && (
        <FilterPill
          onRemove={() =>
            updateAndApplyFilters({ ...filters, favorite: undefined })
          }
        >
          Favorites only
        </FilterPill>
      )}
      {filters.status?.map((val) => (
        <FilterPill
          key={val}
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              status: removeArrayValue(filters.status, val),
            })
          }
        >
          Status: {capitalizeWords(val)}
        </FilterPill>
      ))}
      {filters.type?.map((val) => (
        <FilterPill
          key={val}
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              type: removeArrayValue(filters.type, val),
            })
          }
        >
          Type: {capitalizeWords(val)}
        </FilterPill>
      ))}
      {(filters.minRating !== undefined || filters.maxRating !== undefined) && (
        <FilterPill
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              minRating: undefined,
              maxRating: undefined,
            })
          }
        >
          Rating: {filters.minRating ?? 0} to {filters.maxRating ?? 10}
        </FilterPill>
      )}
      {filters.createdFrom && (
        <FilterPill
          onRemove={() =>
            updateAndApplyFilters({ ...filters, createdFrom: undefined })
          }
        >
          Added from: {dayjs(filters.createdFrom).format("MMM DD, YYYY")}
        </FilterPill>
      )}
      {filters.createdTo && (
        <FilterPill
          onRemove={() =>
            updateAndApplyFilters({ ...filters, createdTo: undefined })
          }
        >
          Added to: {dayjs(filters.createdTo).format("MMM DD, YYYY")}
        </FilterPill>
      )}
      {filters.sources?.map((val) => (
        <FilterPill
          key={val}
          bg={sourceColorMap.get(val) ?? "grape"}
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              sources: removeArrayValue(filters.sources, val),
            })
          }
        >
          Source: {val}
        </FilterPill>
      ))}
      {filters.tags?.map((val) => (
        <FilterPill
          key={val}
          bg={tagColorMap.get(val) ?? "grape"}
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              tags: removeArrayValue(filters.tags, val),
            })
          }
        >
          Tag: {val}
        </FilterPill>
      ))}
    </Group>
  );
}
