import { api } from "#/lib/api";
import {
  Avatar,
  Combobox,
  ComboboxOption,
  Group,
  InputBase,
  Loader,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { SourceMediaRecord } from "@media-voyage/shared/api";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import { useQuery } from "@tanstack/react-query";

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

  const { data = [], isFetching } = useQuery({
    queryKey: ["media-search", props.type, debouncedSearch],
    enabled: debouncedSearch.trim().length >= 2,
    queryFn: () =>
      api<SourceMediaRecord[]>(
        `/media/search?q=${encodeURIComponent(debouncedSearch)}&type=${props.type}`,
      ),
  });

  const options = data.map((item) => (
    <Combobox.Option
      key={getMediaOptionValue(item)}
      value={getMediaOptionValue(item)}
    >
      <MediaOption media={item} />
    </Combobox.Option>
  ));

  return (
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
            imageUrl: "",
            externalId: "",
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
          placeholder="Search movie or TV show..."
          rightSection={
            isFetching ? <Loader size={16} /> : <Combobox.Chevron />
          }
        />
      </Combobox.Target>

      <Combobox.Dropdown style={{ maxHeight: 300, overflowY: "auto" }}>
        <Combobox.Options>
          {data.length > 0 ? (
            options
          ) : (
            <Combobox.Empty>
              {debouncedSearch.length < 2
                ? "Type at least 2 characters"
                : "No results"}
            </Combobox.Empty>
          )}
          {props.search.trim().length >= 2 && (
            <ComboboxOption value="$create">
              + Create {props.search}
            </ComboboxOption>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
