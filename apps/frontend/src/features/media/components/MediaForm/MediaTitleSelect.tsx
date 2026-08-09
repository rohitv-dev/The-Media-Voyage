import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { capitalizeWords } from "#/utils/strings";
import {
  Avatar,
  Badge,
  Combobox,
  ComboboxOption,
  Group,
  HoverCard,
  Image,
  InputBase,
  Loader,
  Popover,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  useCombobox,
} from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import type { SourceMediaRecord } from "@media-voyage/shared/api";
import type { MediaType } from "@media-voyage/shared/userMediaSchema";
import {
  IconAlertTriangle,
  IconCheck,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "./context";

const sourceLabels: Record<string, string> = {
  db: "catalog",
  tmdb_movie: "TMDB",
  tmdb_tv: "TMDB",
  igdb: "IGDB",
};

const searchPlaceholders: Record<MediaType, string> = {
  movie: "Search movies...",
  show: "Search TV shows...",
  game: "Search games...",
  book: "Search your library or add a new book...",
};

interface MediaTitleSelectProps {
  value: SourceMediaRecord | null;
  onChange: (value: SourceMediaRecord | null) => void;
  onSearchChange: (value: string) => void;
}

function getMediaOptionValue(media: SourceMediaRecord) {
  return (
    media.id ||
    `${media.source}:${media.externalId ?? `${media.type}:${media.title}`}`
  );
}

function MediaOption({ media }: { media: SourceMediaRecord }) {
  const isTouchDevice = useMediaQuery("(hover: none)");
  const imageUrl = media.imageUrl;
  const avatar = <Avatar src={imageUrl} radius="sm" size={40} />;
  const optionDetails = (
    <>
      <Stack gap={0} style={{ flex: 1 }}>
        <Text size="sm" fw={500}>
          {media.title} {media.creators ? `(${media.creators.join(", ")})` : ""}
        </Text>

        <Text size="xs" c="dimmed">
          {media.type}
        </Text>
      </Stack>

      <Badge
        color={media.source === "db" ? "teal" : "gray"}
        variant="light"
        size="sm"
      >
        {capitalizeWords(sourceLabels[media.source] ?? media.source)}
      </Badge>
    </>
  );

  const optionContent = (
    <Group gap="sm" wrap="nowrap">
      {avatar}
      {optionDetails}
    </Group>
  );

  if (!imageUrl) return optionContent;

  const previewImage = (
    <Image
      src={imageUrl}
      alt={`${media.title} poster`}
      w={140}
      h={190}
      fit="contain"
      radius="sm"
      style={{
        display: "block",
        backgroundColor: "var(--mantine-color-body)",
      }}
    />
  );

  if (isTouchDevice) {
    return (
      <Group gap="sm" wrap="nowrap">
        <Popover
          width={156}
          position="right-start"
          offset={10}
          withArrow
          shadow="xl"
          zIndex={400}
        >
          <Popover.Target>
            <UnstyledButton
              type="button"
              aria-label={`Preview ${media.title} poster`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              style={{ lineHeight: 0, cursor: "zoom-in" }}
            >
              {avatar}
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown p={6}>{previewImage}</Popover.Dropdown>
        </Popover>
        {optionDetails}
      </Group>
    );
  }

  return (
    <HoverCard
      width={156}
      position="right-start"
      offset={10}
      openDelay={100}
      closeDelay={220}
      withArrow
      shadow="xl"
      zIndex={400}
    >
      <HoverCard.Target>{optionContent}</HoverCard.Target>
      <HoverCard.Dropdown p={6}>{previewImage}</HoverCard.Dropdown>
    </HoverCard>
  );
}

export function MediaTitleSelect(props: MediaTitleSelectProps) {
  const form = useFormContext();
  const combobox = useCombobox();
  const search = form.values.title;
  const type = form.values.type;

  const [debouncedSearch] = useDebouncedValue(search, 500);
  const trimmedSearch = search.trim();
  const isBookSearch = type === "book";

  const {
    data = [],
    isFetching,
    isError,
  } = useQuery({
    queryKey: queryKeys.mediaSearch(type, debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2,
    queryFn: () =>
      api<SourceMediaRecord[]>(
        `/media/search?q=${encodeURIComponent(debouncedSearch)}&type=${type}`,
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
              title: search,
              type,
              imageUrl: null,
              externalId: null,
            });
            props.onSearchChange(search);
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
            value={search}
            error={form.errors.title}
            description={
              isBookSearch
                ? "Book search isn't available yet — matches only come from titles you've already added"
                : undefined
            }
            onChange={(event) => {
              const value = event.currentTarget.value;
              form.setFieldValue("title", value);
              props.onSearchChange(value);

              if (value.length >= 2) {
                combobox.openDropdown();
              } else {
                combobox.closeDropdown();
              }
            }}
            onFocus={() => combobox.openDropdown()}
            placeholder={searchPlaceholders[type]}
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
                    <ThemeIcon variant="light" size={32} radius="sm">
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
              Matched from{" "}
              {capitalizeWords(
                sourceLabels[props.value.source] ?? props.value.source,
              )}
            </Badge>
          )}
        </Group>
      )}
    </Stack>
  );
}
