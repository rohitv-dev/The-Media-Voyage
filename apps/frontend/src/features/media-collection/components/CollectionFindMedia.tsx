import { LibrarySearchPanel } from "#/features/media/components/LibrarySearchPanel";
import { userMediaHybridSearchQueryOptions } from "#/features/media/queries";
import { getApiErrorMessage, api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import { capitalizeWords } from "#/utils/strings";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { IconCheck, IconSearch } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "mantine-datatable";
import { useEffect, useMemo, useState } from "react";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";

type CollectionFindMediaProps = {
  collectionId: string;
  includedMediaIds: string[];
};

function MediaIdentity({ media }: { media: MediaRecord }) {
  return (
    <Group gap="sm" wrap="nowrap" miw={0}>
      <Avatar src={media.imageUrl} radius="sm" size={42}>
        <IconSearch size={18} />
      </Avatar>
      <Stack gap={2} miw={0}>
        <Text fw={600} truncate>
          {media.title}
        </Text>
        <Badge size="xs" variant="light" w="fit-content">
          {capitalizeWords(media.type)}
        </Badge>
      </Stack>
    </Group>
  );
}

export function CollectionFindMedia({
  collectionId,
  includedMediaIds,
}: CollectionFindMediaProps) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const {
    data: results = [],
    isError,
    error,
    isFetching,
  } = useQuery(userMediaHybridSearchQueryOptions(query));
  const includedIds = useMemo(
    () => new Set(includedMediaIds),
    [includedMediaIds],
  );
  const selectedResults = results.filter(
    (result) => selectedIds.has(result.id) && !includedIds.has(result.id),
  );

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set(
        [...current].filter((mediaId) => !includedIds.has(mediaId)),
      );
      return next.size === current.size ? current : next;
    });
  }, [includedIds]);

  const addMutation = useMutation({
    mutationFn: (userMediaIds: string[]) =>
      api(`/collectionItem/${collectionId}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMediaIds }),
      }),
    onSuccess: async (_, userMediaIds) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.items(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.itemsDetailed(collectionId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.collection.all,
      });
      setSelectedIds(new Set());
      showSuccessNotification({
        message: `Added ${userMediaIds.length} ${
          userMediaIds.length === 1 ? "item" : "items"
        } to collection`,
      });
    },
    onError: (mutationError: Error) => {
      showErrorNotification({ message: getApiErrorMessage(mutationError) });
    },
  });

  const toggleSelection = (mediaId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(mediaId)) next.delete(mediaId);
      else next.add(mediaId);
      return next;
    });
  };

  const startSearch = (nextQuery: string) => {
    if (nextQuery !== query) setSelectedIds(new Set());
    setQuery(nextQuery);
  };

  const clearSearch = () => {
    setSelectedIds(new Set());
    setQuery("");
  };

  const renderSelection = (record: MediaRecord) => {
    const included = includedIds.has(record.id);

    return (
      <Checkbox
        aria-label={
          included
            ? `${record.title} is already in this collection`
            : `Select ${record.title}`
        }
        checked={selectedIds.has(record.id)}
        disabled={included || addMutation.isPending}
        onChange={() => toggleSelection(record.id)}
      />
    );
  };

  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Stack gap={2}>
          <Title order={3}>Find media</Title>
          <Text size="sm" c="dimmed">
            Describe what you want to find, then select matching library media
            to add.
          </Text>
        </Stack>

        <LibrarySearchPanel
          query={query}
          isSearching={isFetching}
          onSearch={startSearch}
          onClear={clearSearch}
          focusRequest={0}
        />

        {isError && (
          <Text size="sm" c="red">
            {getApiErrorMessage(error, "Search failed. Try again.")}
          </Text>
        )}

        {query && !isFetching && !isError && results.length === 0 && (
          <Text size="sm" c="dimmed">
            No matching library media found.
          </Text>
        )}

        {results.length > 0 && (
          <>
            <Card withBorder radius="md" p="xs" hiddenFrom="sm">
              <Stack gap="xs">
                {results.map((record) => {
                  const included = includedIds.has(record.id);
                  return (
                    <Group
                      key={record.id}
                      wrap="nowrap"
                      p="xs"
                      style={{ opacity: included ? 0.55 : 1 }}
                    >
                      {renderSelection(record)}
                      <MediaIdentity media={record} />
                      {included && (
                        <Text size="xs" c="dimmed" ml="auto">
                          Added
                        </Text>
                      )}
                    </Group>
                  );
                })}
              </Stack>
            </Card>

            <Box visibleFrom="sm">
              <DataTable
                records={results}
                idAccessor="id"
                minHeight={180}
                verticalAlign="center"
                withTableBorder
                borderRadius="md"
                highlightOnHover
                columns={[
                  {
                    accessor: "select",
                    title: "",
                    width: 48,
                    render: renderSelection,
                  },
                  {
                    accessor: "title",
                    title: "Media",
                    render: (record) => <MediaIdentity media={record} />,
                  },
                  {
                    accessor: "included",
                    title: "",
                    width: 110,
                    render: (record) =>
                      includedIds.has(record.id) ? (
                        <Text size="sm" c="dimmed">
                          Added
                        </Text>
                      ) : null,
                  },
                ]}
                rowStyle={(record) => ({
                  opacity: includedIds.has(record.id) ? 0.55 : 1,
                })}
              />
            </Box>

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                {selectedResults.length} selected
              </Text>
              <Button
                leftSection={<IconCheck size={16} />}
                loading={addMutation.isPending}
                disabled={selectedResults.length === 0}
                onClick={() =>
                  addMutation.mutate(selectedResults.map((result) => result.id))
                }
              >
                Add selected
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Card>
  );
}
