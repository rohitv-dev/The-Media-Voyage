import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Accordion,
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
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
};

export function MediaFilterCard({
  filters,
  updateFilters,
  applyFilters,
  resetFilters,
}: MediaFilterCardsProps) {
  return (
    <Card withBorder miw={250}>
      <Stack>
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

        <Card.Section>
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
              <Group grow>
                <NumberInput size="xs" placeholder="Min" />
                <NumberInput flex="1" size="xs" placeholder="Max" />
              </Group>
            </FilterAccordionItem>

            <FilterAccordionItem value="dateAdded" title="Date Added">
              <Group grow>
                <DateInput size="xs" placeholder="From" />
                <DateInput size="xs" placeholder="To" />
              </Group>
            </FilterAccordionItem>
          </Accordion>
        </Card.Section>

        <Group grow>
          <Button size="xs" variant="light" onClick={resetFilters}>
            Reset Filters
          </Button>
          <Button size="xs" onClick={applyFilters}>
            Apply Filters
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
