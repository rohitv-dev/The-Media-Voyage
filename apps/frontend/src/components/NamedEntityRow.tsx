import { api } from "#/lib/api";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  ActionIcon,
  Badge,
  Card,
  ColorInput,
  Group,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCheck, IconEdit, IconTrash, IconX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

type NamedEntity = {
  id: string;
  name: string;
  color: string | null;
  usageCount: number;
};

type NamedEntityRowProps<T extends NamedEntity> = {
  entity: T;
  basePath: string;
  entityLabel: string;
  invalidateKeys: string[][];
  filterKey: "tags" | "sources";
};

export function NamedEntityRow<T extends NamedEntity>({
  entity,
  basePath,
  entityLabel,
  invalidateKeys,
  filterKey,
}: NamedEntityRowProps<T>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(entity.name);
  const [color, setColor] = useState(entity.color ?? "");

  const invalidate = () =>
    Promise.all(
      invalidateKeys.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; color?: string | null }) =>
      api<T>(`${basePath}/${entity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => {
      showErrorNotification({ message: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`${basePath}/${entity.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await invalidate();
      showSuccessNotification({
        message: `Deleted ${entityLabel} "${entity.name}"`,
      });
    },
    onError: (error: Error) => {
      showErrorNotification({ message: error.message });
    },
  });

  const handleSaveName = () => {
    const trimmed = name.trim();

    if (!trimmed || trimmed === entity.name) {
      setName(entity.name);
      setEditing(false);
      return;
    }

    updateMutation.mutate(
      { name: trimmed },
      { onSuccess: () => setEditing(false) },
    );
  };

  const handleCancelName = () => {
    setName(entity.name);
    setEditing(false);
  };

  return (
    <Card withBorder p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" flex={1} style={{ minWidth: 0 }}>
          <ColorInput
            value={color}
            onChange={setColor}
            onChangeEnd={(value) =>
              updateMutation.mutate({ color: value || null })
            }
            format="hex"
            withEyeDropper={false}
            placeholder="No color"
            size="xs"
            w={130}
            aria-label={`Color for ${entity.name}`}
          />

          {editing ? (
            <TextInput
              flex={1}
              size="xs"
              autoFocus
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSaveName();
                if (event.key === "Escape") handleCancelName();
              }}
            />
          ) : (
            <Text fw={500} lineClamp={1}>
              {entity.name}
            </Text>
          )}
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Tooltip
            label={`View ${entity.usageCount === 1 ? "item" : "items"} in library`}
            withArrow
          >
            <Badge
              variant="light"
              color="gray"
              style={{ cursor: "pointer" }}
              onClick={() =>
                navigate({
                  to: "/media",
                  search: { [filterKey]: [entity.name] },
                })
              }
            >
              {entity.usageCount} {entity.usageCount === 1 ? "item" : "items"}
            </Badge>
          </Tooltip>

          {editing ? (
            <>
              <Tooltip label="Save" withArrow>
                <ActionIcon
                  color="green"
                  variant="light"
                  aria-label={`Save name for ${entity.name}`}
                  onClick={handleSaveName}
                >
                  <IconCheck size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Cancel" withArrow>
                <ActionIcon
                  color="red"
                  variant="light"
                  aria-label="Cancel rename"
                  onClick={handleCancelName}
                >
                  <IconX size={16} />
                </ActionIcon>
              </Tooltip>
            </>
          ) : (
            <Tooltip label="Rename" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`Rename ${entity.name}`}
                onClick={() => setEditing(true)}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label={`Delete ${entityLabel}`} withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={`Delete ${entity.name}`}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}
