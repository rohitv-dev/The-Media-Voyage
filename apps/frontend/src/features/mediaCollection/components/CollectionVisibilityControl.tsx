import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import { Group, List, SegmentedControl, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { MediaCollectionRecord } from "@media-voyage/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bumpCollectionVisibility,
  getVisibilityMismatch,
  updateCollection,
} from "../queries";

type Visibility = NonNullable<MediaCollectionRecord["visibility"]>;

const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Private",
  friends: "Friends",
  public: "Public",
};

/**
 * Sets a collection's visibility, then — if the collection now reaches further
 * than some of the entries inside it — offers to widen those entries too.
 *
 * The offer is deliberately a separate, explicit step. A collection's
 * visibility never overrides an entry's own, so an entry marked private stays
 * hidden until its owner says otherwise here.
 */
export function CollectionVisibilityControl({
  collection,
}: {
  collection: MediaCollectionRecord;
}) {
  const queryClient = useQueryClient();
  const current = (collection.visibility ?? "private") as Visibility;

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["collection"] }),
      queryClient.invalidateQueries({ queryKey: ["user-media"] }),
    ]);

  const bumpMutation = useMutation({
    mutationFn: () => bumpCollectionVisibility(collection.id),
    onSuccess: ({ updated }) =>
      showSuccessNotification({
        message: `${updated} ${updated === 1 ? "entry is" : "entries are"} now shared.`,
      }),
    onError: (error) =>
      showErrorNotification({
        title: "Could not update entries",
        message: error.message,
      }),
    onSettled: refresh,
  });

  const promptToBump = async (visibility: Visibility) => {
    const { entries } = await getVisibilityMismatch(collection.id);

    if (!entries.length) return;

    const label = VISIBILITY_LABEL[visibility].toLowerCase();

    modals.openConfirmModal({
      title: "Some entries are still more private",
      children: (
        <Stack gap="sm">
          <Text size="sm">
            {entries.length === 1
              ? "1 entry in this collection is"
              : `${entries.length} entries in this collection are`}{" "}
            more private than the collection itself, so they stay hidden even
            though the collection is now {label}:
          </Text>

          <List size="sm" spacing={4} withPadding>
            {entries.slice(0, 8).map((entry) => (
              <List.Item key={entry.userMediaId}>
                {entry.title}{" "}
                <Text span c="dimmed" size="xs">
                  ({entry.visibility ?? "private"})
                </Text>
              </List.Item>
            ))}
            {entries.length > 8 && (
              <List.Item c="dimmed">
                and {entries.length - 8} more…
              </List.Item>
            )}
          </List>

          <Text size="sm">
            Set them to {label} as well, or leave them as they are?
          </Text>
        </Stack>
      ),
      labels: {
        confirm: `Set them to ${label}`,
        cancel: "Leave them as they are",
      },
      onConfirm: () => bumpMutation.mutate(),
    });
  };

  const visibilityMutation = useMutation({
    mutationFn: (visibility: Visibility) =>
      updateCollection(collection.id, { visibility }),
    onSuccess: async (_result, visibility) => {
      showSuccessNotification({
        message: `Collection is now ${VISIBILITY_LABEL[visibility].toLowerCase()}.`,
        autoClose: 1500,
      });

      // Ask before refreshing: invalidating the collection list re-suspends the
      // route that renders this control, which would tear down the prompt
      // mid-flight. Opening the modal is synchronous, so this returns straight
      // away and the refresh still happens below.
      // Only worth asking when the collection actually shares something.
      if (visibility !== "private") await promptToBump(visibility);

      await refresh();
    },
    onError: (error) =>
      showErrorNotification({
        title: "Could not update collection",
        message: error.message,
      }),
  });

  return (
    <Group gap="sm" wrap="wrap">
      <Text size="sm" fw={600}>
        Visibility
      </Text>
      <SegmentedControl
        size="xs"
        value={current}
        disabled={visibilityMutation.isPending || bumpMutation.isPending}
        onChange={(value) => {
          if (value === current) return;
          visibilityMutation.mutate(value as Visibility);
        }}
        aria-label="Collection visibility"
        data={[
          { value: "private", label: "Private" },
          { value: "friends", label: "Friends" },
          { value: "public", label: "Public" },
        ]}
      />
    </Group>
  );
}
