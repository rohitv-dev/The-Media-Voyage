import { api, ApiError } from "#/lib/api";
import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Container,
  Stack,
  Grid,
  Card,
  Group,
  Title,
  Checkbox,
  TextInput,
  Select,
  NumberInput,
  Progress,
  MultiSelect,
  Textarea,
  Button,
  Text,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { showNotification } from "@mantine/notifications";
import type {
  UserMediaFormSchema,
  MediaDetailedRecord,
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
  IconLock,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { userMediaDetailedOptions, userMediaQueryOptions } from "../queries";

type MediaFormProps =
  | {
      mode: "add";
    }
  | {
      id: string;
      mode: "update";
      initialValues: UserMediaFormSchema;
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
  lastProgressUpdate: undefined,
  seasonsProgress: undefined,
};

export function MediaForm(props: MediaFormProps) {
  const { mode } = props;
  const isAddMode = mode === "add";

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<UserMediaFormSchema>({
    initialValues: isAddMode ? addInitialValues : props.initialValues,
    transformValues: (values) => ({
      timeSpent: Number(values.timeSpent) === 0 ? undefined : values.timeSpent,
      ...values,
    }),
  });

  form.watch("status", ({ value }) => {
    if (value === "completed") {
      form.setFieldValue("progress", 100);
    }
  });

  const addMutation = useMutation<
    MediaDetailedRecord,
    Error,
    UserMediaFormSchema
  >({
    mutationFn: async (data) => {
      return api("/user-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: async (data) => {
      showNotification({
        title: "Media Added Successfully",
        message: `${data.title} has been added to your list`,
        color: "teal",
      });
      await queryClient.invalidateQueries(userMediaQueryOptions);
      navigate({
        to: "/media",
      });
    },
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
      return Promise.reject(new Error("Invalid mode for update"));
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
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.data && error.data.type === "validation") {
          showNotification({
            title: "Error",
            message: error.data.details,
            color: "red",
            position: "top-center",
          });
        }
      }
    },
  });

  const handleSubmit = (values: UserMediaFormSchema) => {
    if (isAddMode) {
      addMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  return (
    <Container pt="sm">
      <Stack gap="lg" pb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Grid gap="xs">
            <Grid.Col span={{ xs: 12 }}>
              <Card withBorder shadow="sm" p="lg" h="100%">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Group align="center" gap="md">
                      <IconMovie size={40} stroke={1.5} />
                      <Stack gap={0}>
                        <Title order={2}>
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
                      label="Mark as Favorite ⭐"
                      {...form.getInputProps("favorite", {
                        type: "checkbox",
                      })}
                    />
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, lg: 7 }}>
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

                  <TextInput
                    label="Title"
                    placeholder="The Lord of the Rings"
                    variant="filled"
                    readOnly={!isAddMode}
                    rightSection={
                      !isAddMode ? (
                        <IconLock size={18} stroke={1.5} color="#868e96" />
                      ) : undefined
                    }
                    {...form.getInputProps("title")}
                  />

                  <Group grow gap="md">
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
                    />

                    <Select
                      label="Visibility"
                      placeholder="Who can see this?"
                      variant="filled"
                      readOnly={!isAddMode}
                      data={visibilityEnumValues.map((val) => ({
                        value: val,
                        label: capitalizeWords(val),
                      }))}
                      rightSection={
                        !isAddMode ? (
                          <IconLock size={18} stroke={1.5} color="#868e96" />
                        ) : undefined
                      }
                      onClick={(e) => {
                        if (!isAddMode) e.stopPropagation();
                      }}
                      {...form.getInputProps("visibility")}
                    />
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, lg: 5 }}>
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
                  <Group grow gap="md">
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
                      min={0}
                      max={10}
                      decimalScale={1}
                      {...form.getInputProps("rating")}
                    />
                  </Group>

                  <Stack gap="xs">
                    <NumberInput
                      variant="filled"
                      label="Progress"
                      min={0}
                      max={100}
                      step={5}
                      {...form.getInputProps("progress")}
                    />
                    {/* <Slider
                      min={0}
                      max={100}
                      step={5}
                      {...form.getInputProps("userMedia.progress")}
                    /> */}
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

            <Grid.Col span={{ xs: 12, lg: 6 }}>
              <Card withBorder shadow="sm" p="lg">
                <Stack gap="md">
                  <Group gap="xs" align="center">
                    <IconClipboard size={20} stroke={2} />
                    <Stack gap={0}>
                      <Text fw={600} size="lg">
                        Progress & Tracking
                      </Text>
                      <Text size="xs" c="dimmed">
                        Keep track of progress, ratings, and completion dates
                      </Text>
                    </Stack>
                  </Group>

                  <Group grow gap="md">
                    <DateInput
                      label="Started At"
                      placeholder="Select date"
                      variant="filled"
                      clearable
                      {...form.getInputProps("startedAt")}
                    />

                    <DateInput
                      label="Completed At"
                      placeholder="Select date"
                      variant="filled"
                      clearable
                      {...form.getInputProps("completedAt")}
                    />
                  </Group>

                  <Group grow gap="md">
                    <NumberInput
                      // value={
                      //   form.values.timeSpent
                      //     ? Number(form.values.timeSpent)
                      //     : undefined
                      // }
                      label="Time Spent"
                      placeholder="120"
                      variant="filled"
                      min={0}
                      suffix=" min"
                      description="Approximate time spent"
                      // onChange={(val) => {
                      //   if (val === "") return;
                      //   form.setFieldValue("timeSpent", Number(val));
                      // }}
                      {...form.getInputProps("timeSpent")}
                    />

                    <NumberInput
                      label="Rewatches"
                      placeholder="0"
                      variant="filled"
                      min={0}
                      description="Number of revisits"
                      {...form.getInputProps("rewatches")}
                    />
                  </Group>

                  <TextInput
                    label="Source"
                    placeholder="Netflix, Steam, Kindle..."
                    variant="filled"
                    description="Where you consumed it"
                    {...form.getInputProps("source")}
                  />

                  <MultiSelect
                    label="Tags"
                    placeholder="Fantasy, Action, Favorite..."
                    variant="filled"
                    searchable
                    // creatable
                    // getCreateLabel={(query) => `+ Create tag "${query}"`}
                    data={[]}
                    description="Organize your collection with tags"
                    {...form.getInputProps("tags")}
                  />
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12, lg: 6 }}>
              <Card withBorder shadow="sm" p="lg" h="100%">
                <Stack gap="md">
                  <Group gap="xs" align="center">
                    <IconPencil size={20} stroke={2} />
                    <Stack gap={0}>
                      <Text fw={600} size="lg">
                        Personal Notes
                      </Text>
                      <Text size="xs" c="dimmed">
                        Capture your thoughts and observations
                      </Text>
                    </Stack>
                  </Group>

                  <Textarea
                    label="Review"
                    placeholder="Share your thoughts about this media..."
                    variant="filled"
                    rows={6}
                    // minRows={6}
                    // autosize
                    description="Your thoughts and opinions"
                    {...form.getInputProps("review")}
                  />

                  <Textarea
                    label="Notes"
                    placeholder="Private notes, memorable moments, recommendations..."
                    variant="filled"
                    rows={4}
                    // minRows={4}
                    // autosize
                    description="Private notes visible only to you"
                    {...form.getInputProps("notes")}
                  />
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ xs: 12 }}>
              <Group justify="flex-end" gap="md">
                <Button variant="light">Cancel</Button>
                <Button
                  type="submit"
                  leftSection={<IconCheck size={18} />}
                  color="blue"
                >
                  {isAddMode ? "Save Media" : "Update Media"}
                </Button>
              </Group>
            </Grid.Col>
          </Grid>
        </form>
      </Stack>
    </Container>
  );
}
