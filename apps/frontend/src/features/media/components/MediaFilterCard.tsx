import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Accordion,
  Box,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type {
  UserMediaDropdowns,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";
import {
  mediaTypeEnumValues,
  statusEnumValues,
} from "@media-voyage/shared/userMediaSchema";
import { IconSearch } from "@tabler/icons-react";
import type { PropsWithChildren } from "react";

function FilterAccordionItem({
  value,
  title,
  children,
}: PropsWithChildren<{
  value: string;
  title: string;
}>) {
  return (
    <Accordion.Item value={value}>
      <Accordion.Control>
        <Text size="sm" fw={500}>
          {title}
        </Text>
      </Accordion.Control>

      <Accordion.Panel>{children}</Accordion.Panel>
    </Accordion.Item>
  );
}

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

  const filterActions = (
    <Group grow>
      <Button size="xs" variant="light" onClick={resetFilters}>
        Reset Filters
      </Button>
      <Button size="xs" onClick={applyFilters}>
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

        <Card.Section
          mx={compact ? "calc(var(--mantine-spacing-md) * -1)" : undefined}
        >
          <Accordion
            multiple
            defaultValue={["status", "type"]}
            chevronIconSize={16}
            variant="default"
          >
            <FilterAccordionItem value="status" title="Status">
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
            </FilterAccordionItem>

            <FilterAccordionItem value="type" title="Type">
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
            </FilterAccordionItem>

            <FilterAccordionItem value="rating" title="Rating">
              <SimpleGrid cols={compact ? 1 : 2} spacing="xs">
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
            </FilterAccordionItem>

            <FilterAccordionItem value="dateAdded" title="Date Added">
              <SimpleGrid cols={compact ? 1 : 2} spacing="xs">
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
            </FilterAccordionItem>

            <FilterAccordionItem value="source" title="Source">
              <MultiSelect
                size="xs"
                searchable
                clearable
                placeholder="Netflix, Kindle, Steam..."
                data={dropdowns.sources}
                value={filters.sources ?? []}
                onChange={(sources) => updateFilters({ ...filters, sources })}
              />
            </FilterAccordionItem>

            <FilterAccordionItem value="tags" title="Tags">
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
            </FilterAccordionItem>
          </Accordion>
        </Card.Section>

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
    </Card>
  );
}
