import { api } from "#/lib/api";
import {
  Avatar,
  Badge,
  Combobox,
  ComboboxOption,
  Group,
  InputBase,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { SourceMediaRecord } from "@media-voyage/shared/api";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import {
  IconAlertTriangle,
  IconCheck,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

const sourceLabels: Record<string, string> = {
  db: "your library",
  omdb: "OMDb",
  igdb: "IGDB",
};

const searchPlaceholders: Record<MediaType, string> = {
  movie: "Search movies...",
  show: "Search TV shows...",
  game: "Search games...",
  book: "Search your library or add a new book...",
};

interface MediaTitleSelectProps {
  search: string;
  type: MediaType;
  value: SourceMediaRecord | null;
  onChange: (value: SourceMediaRecord | null) => void;
  onSearchChange: (value: string) => void;
  onBlur?: () => void;
  error?: React.ReactNode;
}

function getMediaOptionValue(media: SourceMediaRecord) {
  return (
    media.id ||
    `${media.source}:${media.externalId ?? `${media.type}:${media.title}`}`
  );
}

function MediaOption({ media }: { media: SourceMediaRecord }) {
  return (
    <Group gap="sm" wrap="nowrap">
      <Avatar
        src={media.imageUrl === "N/A" ? null : media.imageUrl}
        radius="sm"
        size={40}
      />

      <Stack gap={0} style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {media.title}
        </Text>

        <Text size="xs" c="dimmed">
          {media.type}
        </Text>
      </Stack>
    </Group>
  );
}

export function MediaTitleSelect(props: MediaTitleSelectProps) {
  const combobox = useCombobox();

  const [debouncedSearch] = useDebouncedValue(props.search, 500);
  const trimmedSearch = props.search.trim();
  const isBookSearch = props.type === "book";

  const { data = [], isFetching, isError } = useQuery({
    queryKey: ["media-search", props.type, debouncedSearch],
    enabled: debouncedSearch.trim().length >= 2,
    queryFn: () =>
      api<SourceMediaRecord[]>(
        `/media/search?q=${encodeURIComponent(debouncedSearch)}&type=${props.type}`,
      ),
  });

  // The debounced query value hasn't caught up to what's currently typed yet,
  // or the request for it is still in flight.
  const isSettled = debouncedSearch.trim() === trimmedSearch && !isFetching;
  const showCreate = trimmedSearch.length >= 2 && isSettled;

  const options = data.map((item) => (
    <Combobox.Option
      key={getMediaOptionValue(item)}
      value={getMediaOptionValue(item)}
    >
      <MediaOption media={item} />
    </Combobox.Option>
  ));

  return (
    <Stack gap={4}>
      <Combobox
        store={combobox}
        withinPortal
        onOptionSubmit={(value) => {
          if (value === "$create") {
            props.onChange({
              id: "",
              source: "manual",
              title: props.search,
              type: props.type,
              imageUrl: null,
              externalId: null,
            });
            props.onSearchChange(props.search);
          } else {
            const media = data.find(
              (item) => getMediaOptionValue(item) === value,
            );

            if (!media) return;

            props.onChange(media);
            props.onSearchChange(media.title);
          }

          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <InputBase
            label="Title"
            variant="filled"
            value={props.search}
            error={props.error}
            description={
              isBookSearch
                ? "Book search isn't available yet — matches only come from titles you've already added"
                : undefined
            }
            onChange={(event) => {
              const value = event.currentTarget.value;
              props.onSearchChange(value);

              if (value.length >= 2) {
                combobox.openDropdown();
              } else {
                combobox.closeDropdown();
              }
            }}
            onFocus={() => combobox.openDropdown()}
            placeholder={searchPlaceholders[props.type]}
            rightSection={
              isFetching ? <Loader size={16} /> : <Combobox.Chevron />
            }
          />
        </Combobox.Target>

        <Combobox.Dropdown style={{ maxHeight: 300, overflowY: "auto" }}>
          <Combobox.Options>
            {data.length > 0 ? (
              <Combobox.Group label="Matches">{options}</Combobox.Group>
            ) : (
              <Combobox.Empty>
                {trimmedSearch.length < 2
                  ? "Type at least 2 characters"
                  : !isSettled
                    ? "Searching…"
                    : isError
                      ? "Search failed — you can still add this manually"
                      : "No matches found"}
              </Combobox.Empty>
            )}
            {showCreate && (
              <Combobox.Group label="Can't find it?">
                <ComboboxOption value="$create">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                      variant="light"
                      color="orange"
                      size={32}
                      radius="sm"
                    >
                      <IconPlus size={16} />
                    </ThemeIcon>
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        Add "{trimmedSearch}" manually
                      </Text>
                      <Text size="xs" c="dimmed">
                        Creates an unverified entry with no poster or synced
                        details
                      </Text>
                    </Stack>
                  </Group>
                </ComboboxOption>
              </Combobox.Group>
            )}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>

      {trimmedSearch.length >= 2 && (
        <Group gap={6}>
          {!props.value ? (
            <Badge
              color="yellow"
              variant="light"
              size="sm"
              leftSection={<IconAlertTriangle size={12} />}
            >
              Not selected — will be added as a new manual entry
            </Badge>
          ) : props.value.source === "manual" ? (
            <Badge
              color="orange"
              variant="light"
              size="sm"
              leftSection={<IconPencil size={12} />}
            >
              Manual entry — no catalog details
            </Badge>
          ) : (
            <Badge
              color="teal"
              variant="light"
              size="sm"
              leftSection={<IconCheck size={12} />}
            >
              Matched from {sourceLabels[props.value.source] ?? props.value.source}
            </Badge>
          )}
        </Group>
      )}
    </Stack>
  );
}
