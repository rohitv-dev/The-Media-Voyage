import {
  ActionIcon,
  Button,
  Card,
  Group,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import type { FormEvent } from "react";
import { IconSearch, IconX } from "@tabler/icons-react";

type SemanticSearchPanelProps = {
  query: string;
  isSearching: boolean;
  onSearch: (query: string) => void;
  onClear: () => void;
};

export function SemanticSearchPanel({
  query,
  isSearching,
  onSearch,
  onClear,
}: SemanticSearchPanelProps) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);

  const isActive = query.length > 0;

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = input.trim();

    if (normalizedQuery.length >= 5) {
      onSearch(normalizedQuery);
    }
  };

  const clearSearch = () => {
    setInput("");
    setFocused(false);
    onClear();
  };

  return (
    <Card withBorder p="xs">
      <form onSubmit={submitSearch}>
        <Group align="center" gap="xs" wrap="nowrap">
          <TextInput
            aria-label="Describe what you're looking for"
            placeholder="Describe what you're looking for..."
            value={input}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => setInput(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            style={{ flex: 1, minWidth: 0 }}
          />
          <Button
            type="submit"
            size="xs"
            loading={isSearching}
            disabled={input.trim().length < 5}
          >
            Explore
          </Button>
          <ActionIcon
            type="button"
            size="sm"
            variant="subtle"
            color="gray"
            aria-label="Close semantic search"
            onClick={clearSearch}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      </form>
      {!isActive && focused && (
        <Text size="xs" c="dimmed" mt={4}>
          Try: "dark psychological horror" or "space exploration games"
        </Text>
      )}
      {isActive && (
        <Group justify="space-between" align="center" gap="xs" mt={4}>
          <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              Semantic results for:
            </Text>
            <Text size="sm" fw={600} truncate>
              &quot;{query}&quot;
            </Text>
          </Group>
          <Button
            type="button"
            size="xs"
            variant="subtle"
            onClick={clearSearch}
          >
            Clear
          </Button>
        </Group>
      )}
    </Card>
  );
}
