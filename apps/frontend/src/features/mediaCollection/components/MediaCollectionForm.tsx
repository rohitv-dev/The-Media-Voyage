import { api } from "#/lib/api";
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
import { showNotification } from "@mantine/notifications";
import type { MediaCollectionFormSchema } from "@media-voyage/shared/api";
import { IconCheck } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export function MediaCollectionForm() {
  const navigate = useNavigate();

  const form = useForm<MediaCollectionFormSchema>({
    initialValues: {
      name: "",
      description: "",
      visibility: "private",
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: async (values: MediaCollectionFormSchema) =>
      api("/collection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      showNotification({
        title: "Collection created",
        message: "Your collection has been saved successfully.",
        color: "teal",
      });
      navigate({ to: "/media" });
    },
    onError: () => {
      showNotification({
        title: "Error",
        message: "Unable to create the collection right now.",
        color: "red",
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
