import { Group, Pill } from "@mantine/core";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import { capitalizeWords } from "#/utils/stringFunctions";
import { useSourceColorMap } from "#/features/sources/queries";
import { useTagColorMap } from "#/features/tags/queries";
import dayjs from "dayjs";

type MediaAppliedFiltersProps = {
  filters: UserMediaQuerySchema;
  updateAndApplyFilters: (filters: UserMediaQuerySchema) => void;
};

function removeArrayValue<T>(values: T[] | undefined, value: T) {
  return values?.filter((currentValue) => currentValue !== value) ?? [];
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
        <Pill
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({ ...filters, search: undefined })
          }
        >
          Search: {filters.search}
        </Pill>
      )}
      {filters.favorite && (
        <Pill
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({ ...filters, favorite: undefined })
          }
        >
          Favorites only
        </Pill>
      )}
      {filters.status?.map((val) => (
        <Pill
          key={val}
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              status: removeArrayValue(filters.status, val),
            })
          }
        >
          Status: {capitalizeWords(val)}
        </Pill>
      ))}
      {filters.type?.map((val) => (
        <Pill
          key={val}
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              type: removeArrayValue(filters.type, val),
            })
          }
        >
          Type: {capitalizeWords(val)}
        </Pill>
      ))}
      {(filters.minRating !== undefined || filters.maxRating !== undefined) && (
        <Pill
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              minRating: undefined,
              maxRating: undefined,
            })
          }
        >
          Rating: {filters.minRating ?? 0} to {filters.maxRating ?? 10}
        </Pill>
      )}
      {filters.createdFrom && (
        <Pill
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({ ...filters, createdFrom: undefined })
          }
        >
          Added from: {dayjs(filters.createdFrom).format("MMM DD, YYYY")}
        </Pill>
      )}
      {filters.createdTo && (
        <Pill
          bg="grape"
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({ ...filters, createdTo: undefined })
          }
        >
          Added to: {dayjs(filters.createdTo).format("MMM DD, YYYY")}
        </Pill>
      )}
      {filters.sources?.map((val) => (
        <Pill
          key={val}
          bg={sourceColorMap.get(val) ?? "grape"}
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              sources: removeArrayValue(filters.sources, val),
            })
          }
        >
          Source: {val}
        </Pill>
      ))}
      {filters.tags?.map((val) => (
        <Pill
          key={val}
          bg={tagColorMap.get(val) ?? "grape"}
          c="white"
          fw="bold"
          withRemoveButton
          onRemove={() =>
            updateAndApplyFilters({
              ...filters,
              tags: removeArrayValue(filters.tags, val),
            })
          }
        >
          Tag: {val}
        </Pill>
      ))}
    </Group>
  );
}
