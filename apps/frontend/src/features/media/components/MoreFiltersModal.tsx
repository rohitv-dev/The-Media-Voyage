import {
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconFilter } from "@tabler/icons-react";
import type {
  UserMediaDropdowns,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";

type MoreFiltersModalProps = {
  opened: boolean;
  onClose: () => void;
  filters: UserMediaQuerySchema;
  updateFilters: (filters: UserMediaQuerySchema) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  dropdowns: UserMediaDropdowns;
  fullScreen?: boolean;
};

export function MoreFiltersModal({
  opened,
  onClose,
  filters,
  updateFilters,
  applyFilters,
  resetFilters,
  dropdowns,
  fullScreen = false,
}: MoreFiltersModalProps) {
  const handleApply = () => {
    applyFilters();
    onClose();
  };

  const handleReset = () => {
    resetFilters();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      fullScreen={fullScreen}
      title={
        <Group gap="xs">
          <ThemeIcon variant="light">
            <IconFilter size={16} />
          </ThemeIcon>
          <Text fw={700}>More filters</Text>
        </Group>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleApply();
        }}
      >
        <Stack gap="md">
          <div>
            <Text size="xs" fw={500} mb={4}>
              Rating
            </Text>
            <SimpleGrid cols={2} spacing="xs">
              <NumberInput
                size="xs"
                placeholder="Min"
                min={0}
                max={10}
                decimalScale={1}
                value={filters.minRating ?? ""}
                onChange={(value) =>
                  updateFilters({
                    ...filters,
                    minRating: typeof value === "number" ? value : undefined,
                  })
                }
              />
              <NumberInput
                flex="1"
                size="xs"
                placeholder="Max"
                min={0}
                max={10}
                decimalScale={1}
                value={filters.maxRating ?? ""}
                onChange={(value) =>
                  updateFilters({
                    ...filters,
                    maxRating: typeof value === "number" ? value : undefined,
                  })
                }
              />
            </SimpleGrid>
          </div>

          <div>
            <Text size="xs" fw={500} mb={4}>
              Date Added
            </Text>
            <SimpleGrid cols={2} spacing="xs">
              <DateInput
                size="xs"
                placeholder="From"
                clearable
                value={filters.createdFrom ?? null}
                maxDate={filters.createdTo}
                onChange={(value) =>
                  updateFilters({
                    ...filters,
                    createdFrom: value ?? undefined,
                  })
                }
              />
              <DateInput
                size="xs"
                placeholder="To"
                clearable
                value={filters.createdTo ?? null}
                minDate={filters.createdFrom}
                onChange={(value) =>
                  updateFilters({
                    ...filters,
                    createdTo: value ?? undefined,
                  })
                }
              />
            </SimpleGrid>
          </div>

          <div>
            <Text size="xs" fw={500} mb={4}>
              Source
            </Text>
            <MultiSelect
              size="xs"
              searchable
              clearable
              placeholder="Netflix, Kindle, Steam..."
              data={dropdowns.sources}
              value={filters.sources ?? []}
              onChange={(sources) => updateFilters({ ...filters, sources })}
            />
          </div>

          <div>
            <Text size="xs" fw={500} mb={4}>
              Tags
            </Text>
            <MultiSelect
              size="xs"
              searchable
              clearable
              placeholder="Choose one or more tags"
              data={dropdowns.tags}
              value={filters.tags ?? []}
              onChange={(tags) => updateFilters({ ...filters, tags })}
            />
            <Text size="xs" c="dimmed" mt={6}>
              Matches entries containing any selected tag.
            </Text>
          </div>

          <Group grow>
            <Button type="button" size="xs" variant="light" onClick={handleReset}>
              Reset Filters
            </Button>
            <Button type="submit" size="xs">
              Apply Filters
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
