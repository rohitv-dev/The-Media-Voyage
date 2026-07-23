import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Box,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type {
  UserMediaDropdowns,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";
import {
  mediaTypeEnumValues,
  statusEnumValues,
} from "@media-voyage/shared/userMediaSchema";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { MoreFiltersModal } from "#/features/media/components/MoreFiltersModal";

type MediaFilterCardsProps = {
  filters: UserMediaQuerySchema;
  updateFilters: (filters: UserMediaQuerySchema) => void;
  applyFilters: () => void;
  resetFilters: () => void;
  dropdowns: UserMediaDropdowns;
  compact?: boolean;
};

export function MediaFilterCard({
  filters,
  updateFilters,
  applyFilters,
  resetFilters,
  dropdowns,
  compact = false,
}: MediaFilterCardsProps) {
  const updateSort = (sort: UserMediaQuerySchema["sort"] | null) => {
    if (sort === null) return;
    updateFilters({ ...filters, sort });
  };

  const updateOrder = (order: UserMediaQuerySchema["order"] | null) => {
    if (order === null) return;
    updateFilters({ ...filters, order });
  };

  const [moreFiltersOpened, { open: openMoreFilters, close: closeMoreFilters }] =
    useDisclosure();

  const activeMoreFiltersCount = [
    filters.minRating !== undefined || filters.maxRating !== undefined,
    filters.createdFrom !== undefined || filters.createdTo !== undefined,
    (filters.sources?.length ?? 0) > 0,
    (filters.tags?.length ?? 0) > 0,
  ].filter(Boolean).length;

  const filterActions = (
    <Group grow>
      <Button
        type="button"
        size="xs"
        variant="light"
        data-shortcut="reset-filters"
        onClick={resetFilters}
      >
        Reset Filters
      </Button>
      <Button type="submit" size="xs">
        Apply Filters
      </Button>
    </Group>
  );

  return (
    <Card
      withBorder
      w={compact ? 260 : "100%"}
      miw={0}
      p={compact ? 0 : undefined}
      mah={compact ? "calc(100dvh - 100px)" : undefined}
      style={
        compact
          ? {
            position: "sticky",
            top: 84,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }
          : undefined
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        style={
          compact
            ? {
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }
            : undefined
        }
      >
        <Stack
          p={compact ? "md" : undefined}
          style={
            compact
              ? {
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                scrollbarGutter: "stable",
              }
              : undefined
          }
        >
          <Title order={5}>Filters</Title>

          <TextInput
            value={filters.search ?? ""}
            variant="filled"
            placeholder="Search Titles"
            leftSection={<IconSearch size={16} />}
            size="xs"
            radius="sm"
            data-shortcut="library-search"
            onChange={(e) =>
              updateFilters({ ...filters, search: e.target.value })
            }
          />

          <SimpleGrid cols={compact ? 1 : 2} spacing="xs">
            <Select
              label="Sort by"
              size="xs"
              allowDeselect={false}
              value={filters.sort}
              data={[
                { value: "updatedAt", label: "Recently updated" },
                { value: "createdAt", label: "Date added" },
                { value: "rating", label: "Rating" },
                { value: "title", label: "Title" },
              ]}
              onChange={updateSort}
            />
            <Select
              label="Order"
              size="xs"
              allowDeselect={false}
              value={filters.order}
              data={[
                { value: "desc", label: "Descending" },
                { value: "asc", label: "Ascending" },
              ]}
              onChange={updateOrder}
            />
          </SimpleGrid>

          <Checkbox
            label="Favorites only"
            checked={filters.favorite === true}
            onChange={(event) =>
              updateFilters({
                ...filters,
                favorite: event.currentTarget.checked ? true : undefined,
              })
            }
          />

          <div>
            <Text size="xs" fw={500} mb={4}>
              Status
            </Text>
            <CheckboxGroup
              value={filters.status}
              onChange={(val) => updateFilters({ ...filters, status: val })}
            >
              <SimpleGrid cols={2} spacing="xs">
                {statusEnumValues.map((value) => (
                  <Checkbox
                    key={value}
                    value={value}
                    label={capitalizeWords(value)}
                  />
                ))}
              </SimpleGrid>
            </CheckboxGroup>
          </div>

          <div>
            <Text size="xs" fw={500} mb={4}>
              Type
            </Text>
            <CheckboxGroup
              value={filters.type}
              onChange={(val) => updateFilters({ ...filters, type: val })}
            >
              <SimpleGrid cols={2} spacing="xs">
                {mediaTypeEnumValues.map((value) => (
                  <Checkbox
                    key={value}
                    value={value}
                    label={capitalizeWords(value)}
                  />
                ))}
              </SimpleGrid>
            </CheckboxGroup>
          </div>

          <Button
            type="button"
            size="xs"
            variant="light"
            leftSection={<IconFilter size={14} />}
            onClick={openMoreFilters}
          >
            More filters
            {activeMoreFiltersCount > 0 ? ` (${activeMoreFiltersCount})` : ""}
          </Button>

          {!compact && filterActions}
        </Stack>

        {compact && (
          <Box
            p="md"
            style={{
              flexShrink: 0,
              borderTop: "1px solid var(--mantine-color-default-border)",
              background: "var(--mantine-color-body)",
            }}
          >
            {filterActions}
          </Box>
        )}
      </form>

      <MoreFiltersModal
        opened={moreFiltersOpened}
        onClose={closeMoreFilters}
        filters={filters}
        updateFilters={updateFilters}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        dropdowns={dropdowns}
        fullScreen={!compact}
      />
    </Card>
  );
}
