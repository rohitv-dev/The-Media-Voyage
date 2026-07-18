import { api, ApiError } from "#/lib/api";
import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Container,
  Stack,
  Grid,
  Card,
  Flex,
  Group,
  Title,
  Checkbox,
  Collapse,
  Select,
  NumberInput,
  Progress,
  SimpleGrid,
  TagsInput,
  Textarea,
  Button,
  Text,
  TextInput,
  UnstyledButton,
  Autocomplete,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import type {
  SourceMediaRecord,
  UserMediaFormSchema,
  MediaDetailedRecord,
  UserMediaDropdowns,
} from "@media-voyage/shared/api";
import {
  mediaTypeEnumValues,
  visibilityEnumValues,
  statusEnumValues,
} from "@media-voyage/shared/userMediaSchema";
import {
  IconMovie,
  IconChartBar,
  IconClipboard,
  IconPencil,
  IconCheck,
  IconChevronDown,
  IconLock,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import {
  userMediaDetailedOptions,
  userMediaDropdownOptions,
  userMediaQueryOptions,
} from "../queries";
import { MediaTitleSelect } from "./MediaTitleSelect";
import { useState } from "react";
import type { ReactNode } from "react";

function CollapsibleSectionHeading({
  icon,
  title,
  description,
  opened,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  opened: boolean;
  onToggle: () => void;
}) {
  const heading = (
    <Group gap="xs" align="center" wrap="nowrap">
      {icon}
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fw={600} size="lg">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Group>
  );

  return (
    <>
      <UnstyledButton
        hiddenFrom="sm"
        w="100%"
        onClick={onToggle}
        aria-expanded={opened}
      >
        <Group justify="space-between" wrap="nowrap" gap="sm">
          {heading}
          <IconChevronDown
            size={18}
            style={{
              flexShrink: 0,
              transform: opened ? "rotate(180deg)" : undefined,
            }}
          />
        </Group>
      </UnstyledButton>

      <Group visibleFrom="sm">{heading}</Group>
    </>
  );
}

type MediaFormProps =
  | {
      mode: "add";
      dropdowns: UserMediaDropdowns;
    }
  | {
      id: string;
      mode: "update";
      initialValues: UserMediaFormSchema;
      dropdowns: UserMediaDropdowns;
    };

const addInitialValues: UserMediaFormSchema = {
  title: "",
  type: "movie",

  status: "planned",
  rating: undefined,
  favorite: false,
  source: "",
  review: "",
  notes: "",
  startedAt: undefined,
  completedAt: undefined,
  progress: undefined,
  rewatches: 0,
  timeSpent: undefined,
  tags: [],
  visibility: "private",
  customFields: undefined,
  seasonsProgress: undefined,
};

function normalizeTags(tags: string[]) {
  const normalizedValues = new Set<string>();

  return tags.reduce<string[]>((normalizedTags, tag) => {
    const trimmedTag = tag.trim();
    const normalizedTag = trimmedTag.toLowerCase();

    if (trimmedTag && !normalizedValues.has(normalizedTag)) {
      normalizedValues.add(normalizedTag);
      normalizedTags.push(trimmedTag);
    }

    return normalizedTags;
  }, []);
}

export function MediaForm(props: MediaFormProps) {
  const { mode } = props;
  const isAddMode = mode === "add";
  const canGoBack = useCanGoBack();

  const [mediaRecord, setMediaRecord] = useState<SourceMediaRecord | null>(
    null,
  );
  const [search, setSearch] = useState(
    props.mode === "add" ? "" : props.initialValues.title,
  );
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 47.99em)");
  const [trackingOpened, { toggle: toggleTracking }] = useDisclosure(false);
  const [notesOpened, { toggle: toggleNotes }] = useDisclosure(false);

  const form = useForm<UserMediaFormSchema>({
    initialValues: isAddMode ? addInitialValues : props.initialValues,
    transformValues: (values) => ({
      ...values,
      timeSpent: Number(values.timeSpent) === 0 ? undefined : values.timeSpent,
      tags: normalizeTags(values.tags ?? []),
    }),
    validate: {
      title: (value) =>
        isAddMode && !value.trim() ? "Title is required" : undefined,
    },
  });
  const isCompleted = form.values.status === "completed";

  const showMutationError = (error: Error) => {
    let message = "Unable to save this media. Please try again.";

    if (error instanceof ApiError) {
      if (error.data?.type === "validation") {
        message = error.data.details;
      } else if (error.status === 401) {
        message = "Your session has expired. Sign in and try again.";
      } else if (error.status === 403) {
        message = "You do not have permission to change this media.";
      } else if (error.status === 404) {
        message = "This media entry could not be found.";
      } else if (error.status >= 500) {
        message = "The server could not save your changes. Try again shortly.";
      } else {
        message = error.data?.error ?? error.message;
      }
    } else if (error instanceof TypeError) {
      message =
        "Unable to reach the server. Check your connection and try again.";
    }

    showNotification({
      title: isAddMode ? "Could not add media" : "Could not update media",
      message,
      color: "red",
      position: "top-center",
    });
  };

  form.watch("status", ({ value, previousValue }) => {
    if (value === "completed") {
      form.setFieldValue("progress", 100);
    } else if (previousValue === "completed") {
      form.setFieldValue("completedAt", undefined);
    }
  });

  const addMutation = useMutation<
    MediaDetailedRecord,
    Error,
    UserMediaFormSchema
  >({
    mutationFn: async (data) => {
      const transformedData: UserMediaFormSchema = {
        ...data,
        mediaId: mediaRecord?.id,
        title: mediaRecord?.title ?? data.title,
        type: mediaRecord?.type ?? data.type,
        externalId: mediaRecord?.externalId,
        imageUrl: mediaRecord?.imageUrl,
        releaseDate: mediaRecord?.releaseDate,
        mediaSource: mediaRecord?.source ?? "manual",
      };

      return api("/user-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedData),
      });
    },
    onSuccess: async (data) => {
      showNotification({
        title: "Media Added Successfully",
        message: `${data.title} has been added to your list`,
        color: "teal",
      });
      await Promise.all([
        queryClient.invalidateQueries(userMediaQueryOptions),
        queryClient.invalidateQueries(userMediaDropdownOptions),
      ]);
      navigate({
        to: "/media",
      });
    },
    onError: showMutationError,
  });

  const updateMutation = useMutation<
    MediaDetailedRecord,
    Error,
    UserMediaFormSchema
  >({
    mutationFn: async (data) => {
      if (!isAddMode) {
        return api(`/user-media/${props.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
      }
      throw new Error("Invalid mode for update");
    },
    onSuccess: async (data) => {
      showNotification({
        title: "Media Updated Successfully",
        message: `${data.title} has been updated`,
        color: "teal",
      });
      await Promise.all([
        queryClient.invalidateQueries(userMediaQueryOptions),
        queryClient.invalidateQueries(userMediaDetailedOptions(data.id)),
        queryClient.invalidateQueries(userMediaDropdownOptions),
      ]);

      if (!isAddMode)
        navigate({
          to: "/media/view/$id",
          params: { id: props.id },
        });
      else
        navigate({
          to: "/media",
        });
    },
    onError: showMutationError,
  });

  const handleSubmit = async (values: UserMediaFormSchema) => {
    if (addMutation.isPending || updateMutation.isPending) {
      return;
    }

    if (isAddMode) {
      addMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  return (
    <Container pt="sm" px={{ base: "xs", md: "sm" }}>
      <Stack gap="lg" pb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gap="xs">
            <Grid.Col span={{ xs: 12 }}>
              <Card
                withBorder
                shadow="sm"
                p={{ base: "md", sm: "lg" }}
                h="100%"
              >
                <Flex
                  direction={{ base: "column", sm: "row" }}
                  align={{ base: "stretch", sm: "center" }}
                  justify="space-between"
                  gap={{ base: "md", sm: "lg" }}
                >
                  <Group align="center" gap="md" wrap="nowrap">
                    <IconMovie
                      size={32}
                      stroke={1.5}
                      style={{ flexShrink: 0 }}
                    />
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Title order={2} fz={{ base: 24, sm: 30 }} lh={1.2}>
                        {isAddMode
                          ? "Add Media to Your Collection"
                          : "Update Media Details"}
                      </Title>
                      <Text c="dimmed" size="xs">
                        {isAddMode
                          ? "Track movies, shows, books, and games and keep notes on your journey"
                          : "Update your media entry and keep your collection current"}
                      </Text>
                    </Stack>
                  </Group>

                  <Checkbox
                    w={{ base: "100%", sm: "auto" }}
                    label="Mark as Favorite ⭐"
                    {...form.getInputProps("favorite", {
                      type: "checkbox",
                    })}
                  />
                </Flex>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, md: 7 }}>
              <Card withBorder shadow="sm" p="lg" h="100%">
                <Stack gap="md">
                  <Group gap="xs" align="center">
                    <IconMovie size={20} stroke={2} />
                    <Stack gap={0}>
                      <Text fw={600} size="lg">
                        Media Details
                      </Text>
                      <Text size="xs" c="dimmed">
                        Basic information about the media you want to track
                      </Text>
                    </Stack>
                  </Group>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Select
                      label="Type"
                      placeholder="Select media type"
                      variant="filled"
                      data={mediaTypeEnumValues.map((val) => ({
                        value: val,
                        label: capitalizeWords(val),
                      }))}
                      readOnly={!isAddMode}
                      rightSection={
                        !isAddMode ? (
                          <IconLock size={18} stroke={1.5} color="#868e96" />
                        ) : undefined
                      }
                      onClick={(e) => {
                        if (!isAddMode) e.stopPropagation();
                      }}
                      {...form.getInputProps("type")}
                      onChange={(value) => {
                        if (!value) return;

                        form.setFieldValue(
                          "type",
                          value as UserMediaFormSchema["type"],
                        );

                        form.setFieldValue("title", "");
                        setSearch("");
                        setMediaRecord(null);
                      }}
                    />

                    <Select
                      label="Visibility"
                      placeholder="Who can see this?"
                      variant="filled"
                      data={visibilityEnumValues.map((val) => ({
                        value: val,
                        label: capitalizeWords(val),
                      }))}
                      {...form.getInputProps("visibility")}
                    />
                  </SimpleGrid>

                  {isAddMode ? (
                    <MediaTitleSelect
                      value={mediaRecord}
                      type={form.values.type}
                      search={search}
                      error={form.errors.title}
                      onChange={(val) => {
                        setMediaRecord(val);
                        if (val) {
                          form.setFieldValue("title", val.title);
                          form.setFieldValue("type", val.type);
                        }
                      }}
                      onSearchChange={(val) => {
                        setSearch(val);
                        form.setFieldValue("title", val);
                        setMediaRecord((current) =>
                          current && current.title !== val ? null : current,
                        );
                      }}
                    />
                  ) : (
                    <TextInput
                      label="Title"
                      variant="filled"
                      readOnly
                      value={form.values.title}
                      rightSection={
                        <IconLock size={18} stroke={1.5} color="#868e96" />
                      }
                    />
                  )}
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, md: 5 }}>
              <Card withBorder shadow="sm" p="lg" h="100%">
                <Stack gap="md">
                  <Group gap="xs" align="center">
                    <IconChartBar size={20} stroke={2} />
                    <Stack gap={0}>
                      <Text fw={600} size="lg">
                        Status Details
                      </Text>
                      <Text size="xs" c="dimmed">
                        State of the media you are tracking
                      </Text>
                    </Stack>
                  </Group>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Select
                      label="Status"
                      placeholder="Choose status"
                      variant="filled"
                      data={statusEnumValues.map((val) => ({
                        value: val,
                        label: capitalizeWords(val),
                      }))}
                      {...form.getInputProps("status")}
                    />

                    <NumberInput
                      label="Rating"
                      placeholder="8.5"
                      variant="filled"
                      inputMode="decimal"
                      min={0}
                      max={10}
                      decimalScale={1}
                      {...form.getInputProps("rating")}
                    />
                  </SimpleGrid>

                  <Stack gap="xs">
                    <NumberInput
                      variant="filled"
                      label="Progress"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={5}
                      {...form.getInputProps("progress")}
                    />

                    <Progress
                      value={form.values.progress ?? 0}
                      size="lg"
                      radius="xl"
                      color="teal"
                    />
                  </Stack>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, md: 6 }}>
              <Card withBorder shadow="sm" p="lg">
                <CollapsibleSectionHeading
                  icon={<IconClipboard size={20} stroke={2} />}
                  title="Progress & Tracking"
                  description="Keep track of progress, ratings, and completion dates"
                  opened={trackingOpened}
                  onToggle={toggleTracking}
                />

                <Collapse expanded={!isMobile || trackingOpened}>
                  <Stack gap="md" mt="md">
                    <SimpleGrid
                      cols={{ base: 1, sm: isCompleted ? 2 : 1 }}
                      spacing="md"
                    >
                      <DateInput
                        label="Started At"
                        placeholder="Select date"
                        variant="filled"
                        clearable
                        {...form.getInputProps("startedAt")}
                      />

                      {isCompleted && (
                        <DateInput
                          label="Completed At"
                          placeholder="Select date"
                          variant="filled"
                          clearable
                          {...form.getInputProps("completedAt")}
                        />
                      )}
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <NumberInput
                        label="Time Spent"
                        placeholder="120"
                        variant="filled"
                        inputMode="numeric"
                        min={0}
                        suffix=" min"
                        description="Approximate time spent"
                        {...form.getInputProps("timeSpent")}
                      />

                      <NumberInput
                        label="Rewatches"
                        placeholder="0"
                        variant="filled"
                        inputMode="numeric"
                        min={0}
                        description="Number of revisits"
                        {...form.getInputProps("rewatches")}
                      />
                    </SimpleGrid>

                    <Autocomplete
                      label="Source"
                      placeholder="Netflix, Steam, Kindle..."
                      variant="filled"
                      description="Where you consumed it"
                      data={props.dropdowns.sources}
                      {...form.getInputProps("source")}
                    />

                    <TagsInput
                      label="Tags"
                      placeholder="Science Fiction, Horror..."
                      variant="filled"
                      data={props.dropdowns.tags}
                      clearable
                      description="Press Enter or comma to add a tag"
                      {...form.getInputProps("tags")}
                      value={form.values.tags ?? []}
                      onChange={(tags) =>
                        form.setFieldValue("tags", normalizeTags(tags))
                      }
                    />
                  </Stack>
                </Collapse>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, md: 6 }}>
              <Card withBorder shadow="sm" p="lg" h="100%">
                <CollapsibleSectionHeading
                  icon={<IconPencil size={20} stroke={2} />}
                  title="Personal Notes"
                  description="Capture your thoughts and observations"
                  opened={notesOpened}
                  onToggle={toggleNotes}
                />

                <Collapse expanded={!isMobile || notesOpened}>
                  <Stack gap="md" mt="md">
                    <Textarea
                      label="Review"
                      placeholder="Share your thoughts about this media..."
                      variant="filled"
                      rows={6}
                      description="Your thoughts and opinions"
                      {...form.getInputProps("review")}
                    />

                    <Textarea
                      label="Notes"
                      placeholder="Private notes, memorable moments, recommendations..."
                      variant="filled"
                      rows={4}
                      description="Private notes visible only to you"
                      {...form.getInputProps("notes")}
                    />
                  </Stack>
                </Collapse>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12 }}>
              <SimpleGrid
                cols={{ base: 1, xs: 2 }}
                spacing="md"
                w={{ base: "100%", xs: 320 }}
                ml="auto"
              >
                <Button
                  variant="light"
                  disabled={addMutation.isPending || updateMutation.isPending}
                  onClick={() => {
                    if (canGoBack) {
                      router.history.back();
                    } else if (isAddMode) {
                      navigate({ to: "/media" });
                    } else {
                      navigate({
                        to: "/media/view/$id",
                        params: { id: props.id },
                      });
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  leftSection={<IconCheck size={18} />}
                  loading={addMutation.isPending || updateMutation.isPending}
                >
                  {isAddMode ? "Save Media" : "Update Media"}
                </Button>
              </SimpleGrid>
            </Grid.Col>
          </Grid>
        </form>
      </Stack>
    </Container>
  );
}
