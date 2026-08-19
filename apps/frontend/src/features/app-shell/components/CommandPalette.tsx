import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { appNavigationItems } from "#/features/app-shell/navigation";
import type { AppShellPath } from "#/features/app-shell/navigation";
import { userMediaSearchQueryOptions } from "#/features/media/queries";
import { capitalizeWords } from "#/utils/strings";
import {
  Badge,
  Combobox,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import {
  IconLibrary,
  IconPlus,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type CommandPaletteProps = {
  opened: boolean;
  onClose: () => void;
  onNavigate: (path: AppShellPath) => void;
  onOpenMedia: (userMediaId: string) => void;
  onOpenLibrarySearch: () => void;
};

const actionItems = [
  {
    label: "Add media",
    description: "Create a new library entry",
    icon: IconPlus,
    path: "/media/add",
    keywords: ["new", "create", "movie", "show", "game", "book"],
  },
  {
    label: "Describe what you want",
    description:
      "Search titles, metadata, and meaning; supports quotes, -exclude, and OR",
    icon: IconSparkles,
    path: "hybrid-search",
    keywords: ["explore", "vague", "meaning", "library"],
  },
] as const;

function matchesQuery(
  item: { label: string; description: string; keywords: readonly string[] },
  query: string,
) {
  if (!query) return true;

  return [item.label, item.description, ...item.keywords]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function CommandOption({
  value,
  icon: Icon,
  label,
  description,
}: {
  value: string;
  icon: typeof IconPlus;
  label: string;
  description: string;
}) {
  return (
    <Combobox.Option value={value} py="sm">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" size={34} radius="md">
          <Icon size={17} />
        </ThemeIcon>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" fw={600} truncate>
            {label}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {description}
          </Text>
        </Stack>
      </Group>
    </Combobox.Option>
  );
}

function MediaOption({
  id,
  title,
  type,
}: {
  id: string;
  title: string;
  type: string;
}) {
  return (
    <Combobox.Option value={`media:${id}`} py="sm">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon variant="light" size={34} radius="md">
          <IconLibrary size={17} />
        </ThemeIcon>
        <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
          {title}
        </Text>
        <Badge variant="light" size="sm">
          {capitalizeWords(type)}
        </Badge>
      </Group>
    </Combobox.Option>
  );
}

export function CommandPalette({
  opened,
  onClose,
  onNavigate,
  onOpenMedia,
  onOpenLibrarySearch,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 300);
  const combobox = useCombobox();
  const isMobile = useMediaQuery("(max-width: 47.99em)");
  const reduceMotion = useAppReducedMotion();
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const isLibrarySearchEnabled = trimmedQuery.length >= 2;
  const isLibrarySearchSettled = debouncedQuery.trim() === trimmedQuery;
  const {
    data: librarySearchResults = [],
    isFetching: isSearchingLibrary,
    isError: isLibrarySearchError,
  } = useQuery(userMediaSearchQueryOptions(opened ? debouncedQuery : ""));
  const visibleLibraryResults =
    isLibrarySearchEnabled && isLibrarySearchSettled
      ? librarySearchResults.slice(0, 20)
      : [];
  let libraryStatus: { message: string; color: "dimmed" | "red" } | undefined;

  if (isLibrarySearchEnabled) {
    if (!isLibrarySearchSettled || isSearchingLibrary) {
      libraryStatus = {
        message: "Searching your library...",
        color: "dimmed",
      };
    } else if (isLibrarySearchError) {
      libraryStatus = {
        message: "Library search is unavailable. Try again.",
        color: "red",
      };
    } else if (librarySearchResults.length === 0) {
      libraryStatus = {
        message: "No library matches found.",
        color: "dimmed",
      };
    }
  }

  const filteredActions = actionItems.filter((item) =>
    matchesQuery(item, normalizedQuery),
  );
  const filteredNavigation = appNavigationItems.filter((item) =>
    matchesQuery(item, normalizedQuery),
  );
  const hasResults =
    visibleLibraryResults.length > 0 ||
    filteredActions.length > 0 ||
    filteredNavigation.length > 0;

  useEffect(() => {
    if (opened) {
      combobox.openDropdown();
      combobox.selectFirstOption();
    } else {
      combobox.closeDropdown();
      setQuery("");
      combobox.resetSelectedOption();
    }
  }, [combobox, normalizedQuery, opened, visibleLibraryResults.length]);

  const reset = () => {
    setQuery("");
    combobox.resetSelectedOption();
  };

  const selectCommand = (value: string) => {
    if (value === "hybrid-search") {
      reset();
      onClose();
      onOpenLibrarySearch();
      return;
    }

    if (value.startsWith("media:")) {
      const userMediaId = value.replace("media:", "");

      reset();
      onClose();
      onOpenMedia(userMediaId);
      return;
    }

    reset();
    onClose();
    onNavigate(value as AppShellPath);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Search or jump"
      size="lg"
      centered={!isMobile}
      fullScreen={isMobile}
      transitionProps={{ duration: reduceMotion ? 0 : 150 }}
      styles={{ body: { paddingTop: 2 } }}
    >
      <Combobox store={combobox} onOptionSubmit={selectCommand}>
        <Combobox.EventsTarget>
          <TextInput
            data-autofocus
            aria-label="Search actions or pages"
            placeholder="Search actions or pages..."
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={17} />}
            rightSectionWidth={50}
          />
        </Combobox.EventsTarget>

        <ScrollArea.Autosize
          mah={isMobile ? "calc(100dvh - 130px)" : 440}
          mt="md"
          type="auto"
        >
          <Combobox.Options>
            {visibleLibraryResults.length > 0 && (
              <Combobox.Group label="Library">
                {visibleLibraryResults.map((entry) => (
                  <MediaOption
                    key={entry.id}
                    id={entry.id}
                    title={entry.title}
                    type={entry.type}
                  />
                ))}
              </Combobox.Group>
            )}

            {libraryStatus && (
              <Text size="xs" c={libraryStatus.color} px="sm" py="xs">
                {libraryStatus.message}
              </Text>
            )}

            {filteredActions.length > 0 && (
              <Combobox.Group label="Actions">
                {filteredActions.map((item) => (
                  <CommandOption
                    key={item.path}
                    value={item.path}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                  />
                ))}
              </Combobox.Group>
            )}

            {filteredNavigation.length > 0 && (
              <Combobox.Group label="Navigate">
                {filteredNavigation.map((item) => (
                  <CommandOption
                    key={item.path}
                    value={item.path}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                  />
                ))}
              </Combobox.Group>
            )}

            {!hasResults && !libraryStatus && (
              <Combobox.Empty>No matching actions or pages</Combobox.Empty>
            )}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox>
    </Modal>
  );
}
