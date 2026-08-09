import { api, getApiErrorMessage } from "#/lib/api";
import {
  Button,
  Card,
  Container,
  Divider,
  Group,
  Radio,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type {
  MediaCollectionFormSchema,
  MediaCollectionRecord,
} from "@media-voyage/shared/api";
import { IconCheck } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useUnsavedChangesBlocker } from "#/hooks/useUnsavedChangesBlocker";
import { queryKeys } from "#/lib/queryKeys";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";

export function MediaCollectionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<MediaCollectionFormSchema>({
    initialValues: {
      name: "",
      description: "",
      visibility: "private",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Name is required"),
    },
  });

  useUnsavedChangesBlocker(() => form.isDirty());

  const createCollectionMutation = useMutation({
    mutationFn: async (values: MediaCollectionFormSchema) =>
      api<MediaCollectionRecord>("/collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      }),
    onSuccess: async (collection) => {
      form.resetDirty();

      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });

      showSuccessNotification({
        title: "Collection created",
        message: "Add media to start filling your collection.",
      });
      navigate({
        to: "/collection/edit/$id",
        params: { id: collection.id },
      });
    },
    onError: (error) => {
      showErrorNotification({
        message: getApiErrorMessage(
          error,
          "Unable to create the collection right now.",
        ),
      });
    },
  });

  const handleSubmit = (values: MediaCollectionFormSchema) => {
    createCollectionMutation.mutate(values);
  };

  return (
    <Container pt="sm">
      <Stack gap="lg" pb="lg">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Card withBorder shadow="sm" p="lg" h="100%">
            <Stack>
              <Title order={2}>New Collection</Title>
              <Divider />
              <Stack>
                <TextInput
                  variant="filled"
                  label="Name"
                  placeholder="Name of collection"
                  {...form.getInputProps("name")}
                />
                <TextInput
                  variant="filled"
                  label="Description"
                  placeholder="Description of collection"
                  {...form.getInputProps("description")}
                />
                <Radio.Group
                  label="Visiblity"
                  {...form.getInputProps("visibility")}
                >
                  <Group mt="sm">
                    <Radio value="private" label="Private" />
                    <Radio value="friends" label="Friends" />
                    <Radio value="public" label="Public" />
                  </Group>
                </Radio.Group>
                <Button
                  type="submit"
                  leftSection={<IconCheck size={18} />}
                  loading={createCollectionMutation.isPending}
                >
                  Save Collection
                </Button>
              </Stack>
            </Stack>
          </Card>
        </form>
      </Stack>
    </Container>
  );
}
