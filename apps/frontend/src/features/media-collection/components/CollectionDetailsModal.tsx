import { getApiErrorMessage } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";
import { queryKeys } from "#/lib/queryKeys";
import { updateCollection } from "#/features/media-collection/queries";
import {
  Button,
  Group,
  Modal,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import type { MediaCollectionRecord } from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type CollectionDetailsValues = {
  name: string;
  description: string;
};

type CollectionDetailsModalProps = {
  collection: Pick<MediaCollectionRecord, "id" | "name" | "description">;
  opened: boolean;
  onClose: () => void;
};

export function CollectionDetailsModal({
  collection,
  opened,
  onClose,
}: CollectionDetailsModalProps) {
  const queryClient = useQueryClient();
  const form = useForm<CollectionDetailsValues>({
    initialValues: {
      name: collection.name,
      description: collection.description ?? "",
    },
    validate: {
      name: (value) => (value.trim() ? null : "Name is required"),
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CollectionDetailsValues) =>
      updateCollection(collection.id, values),
    onSuccess: async () => {
      form.resetDirty();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      showSuccessNotification({
        title: "Collection updated",
        message: "The collection details were saved.",
      });
      onClose();
    },
    onError: (error) => {
      showErrorNotification({
        title: "Could not update collection",
        message: getApiErrorMessage(error),
      });
    },
  });

  const handleClose = () => {
    if (updateMutation.isPending) return;

    form.setValues({
      name: collection.name,
      description: collection.description ?? "",
    });
    form.resetDirty();
    updateMutation.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Edit collection details"
      centered
      closeOnClickOutside={!updateMutation.isPending}
      closeOnEscape={!updateMutation.isPending}
      withCloseButton={!updateMutation.isPending}
    >
      <form onSubmit={form.onSubmit((values) => updateMutation.mutate(values))}>
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Collection name"
            autoFocus
            {...form.getInputProps("name")}
          />
          <Textarea
            label="Description"
            placeholder="What belongs in this collection?"
            autosize
            minRows={3}
            maxRows={7}
            {...form.getInputProps("description")}
          />
          <Group justify="flex-end">
            <Button
              type="button"
              variant="default"
              disabled={updateMutation.isPending}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
