import { pickPlannedMedia } from "#/features/media/queries";
import { api } from "#/lib/api";
import { EmptyState } from "#/components/EmptyState";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import { capitalizeWords } from "#/utils/stringFunctions";
import {
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import type {
  MediaCollectionRecord,
  MediaPickerQuery,
  MediaRecord,
} from "@media-voyage/shared/api";
import { mediaTypeOptions } from "../options";
import { IconDice5, IconPlayerPlay, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";

type MediaPickerModalProps = {
  opened: boolean;
  onClose: () => void;
  onView: (id: string) => void;
  sources: string[];
  tags: string[];
  collections: MediaCollectionRecord[];
};

const emptyFilters: MediaPickerQuery = {};

export function MediaPickerModal({
  opened,
  onClose,
  onView,
  sources,
  tags,
  collections,
}: MediaPickerModalProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<MediaPickerQuery>(emptyFilters);

  const pickMutation = useMutation({
    mutationFn: pickPlannedMedia,
    onError: (error) =>
      showErrorNotification({
        title: "Could not pick an item",
        message: error.message,
      }),
  });

  const startMutation = useMutation({
    mutationFn: (id: string) =>
      api<MediaRecord>(`/user-media/${id}/quick-actions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      }),
    onSuccess: (record) => {
      void queryClient.invalidateQueries({ queryKey: ["user-media"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      showSuccessNotification({
        title: "Journey started",
        message: `${record.title} is now in progress.`,
      });
      closeModal();
    },
    onError: (error) =>
      showErrorNotification({
        title: "Could not start item",
        message: error.message,
      }),
  });

  const closeModal = () => {
    pickMutation.reset();
    onClose();
  };

  const updateFilter = <TKey extends keyof MediaPickerQuery>(
    key: TKey,
    value: MediaPickerQuery[TKey],
  ) => {
    setFilters((current) => ({ ...current, [key]: value || undefined }));
    pickMutation.reset();
  };

  const picked = pickMutation.data;

  return (
    <Modal
      opened={opened}
      onClose={closeModal}
      centered
      size="lg"
      title={
        <Group gap="xs">
          <ThemeIcon variant="light" color="violet" radius="xl">
            <IconDice5 size={18} />
          </ThemeIcon>
          <Text fw={700}>What should I pick?</Text>
        </Group>
      }
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Narrow the field if you like. Every result comes from your Planned
          list.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Select
            label="Media type"
            placeholder="Any type"
            clearable
            data={mediaTypeOptions}
            value={filters.type ?? null}
            onChange={(value) =>
              updateFilter("type", value as MediaPickerQuery["type"])
            }
          />
          <Select
            label="Source"
            placeholder="Any source"
            searchable
            clearable
            data={sources}
            value={filters.source ?? null}
            onChange={(value) => updateFilter("source", value ?? undefined)}
          />
          <Select
            label="Tag"
            placeholder="Any tag"
            searchable
            clearable
            data={tags}
            value={filters.tag ?? null}
            onChange={(value) => updateFilter("tag", value ?? undefined)}
          />
          <Select
            label="Collection"
            placeholder="Any collection"
            searchable
            clearable
            data={collections.map((collection) => ({
              value: collection.id,
              label: collection.name,
            }))}
            value={filters.collectionId ?? null}
            onChange={(value) =>
              updateFilter("collectionId", value ?? undefined)
            }
          />
        </SimpleGrid>

        {!pickMutation.isSuccess ? (
          <Card withBorder radius="md" p="xl">
            <Stack align="center" gap="sm">
              <IconDice5 size={38} stroke={1.4} />
              <Text ta="center" fw={600}>
                Ready when you are
              </Text>
              <Button
                leftSection={<IconDice5 size={18} />}
                loading={pickMutation.isPending}
                onClick={() => pickMutation.mutate(filters)}
              >
                Pick something
              </Button>
            </Stack>
          </Card>
        ) : picked ? (
          <motion.div
            key={picked.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card withBorder radius="md" p="lg">
              <Group align="flex-start" wrap="nowrap">
                {picked.imageUrl && (
                  <Image
                    src={picked.imageUrl}
                    alt=""
                    w={76}
                    h={104}
                    radius="sm"
                    fit="cover"
                  />
                )}
                <Stack gap="xs" flex={1}>
                  <Badge variant="light" color="violet" w="fit-content">
                    {capitalizeWords(picked.type)}
                  </Badge>
                  <Title order={3}>{picked.title}</Title>
                  {picked.source && (
                    <Text size="sm" c="dimmed">
                      {picked.source}
                    </Text>
                  )}
                  <Group gap="xs" mt="xs">
                    <Button variant="default" onClick={() => onView(picked.id)}>
                      View details
                    </Button>
                    <Button
                      leftSection={<IconPlayerPlay size={17} />}
                      loading={startMutation.isPending}
                      onClick={() => startMutation.mutate(picked.id)}
                    >
                      Start this
                    </Button>
                  </Group>
                </Stack>
              </Group>
            </Card>
          </motion.div>
        ) : (
          <EmptyState
            radius="md"
            title="No planned items match those filters"
            description="Clear one or more filters and try again."
          />
        )}

        {pickMutation.isSuccess && (
          <Button
            variant="subtle"
            leftSection={<IconRefresh size={17} />}
            loading={pickMutation.isPending}
            onClick={() => pickMutation.mutate(filters)}
          >
            Pick again
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
