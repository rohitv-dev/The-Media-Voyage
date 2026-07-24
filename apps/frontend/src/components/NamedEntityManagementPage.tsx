import { EmptyState } from "#/components/EmptyState";
import { NamedEntityRow } from "#/components/NamedEntityRow";
import { AddNamedEntityModal } from "#/components/AddNamedEntityModal";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";

type NamedEntity = {
  id: string;
  name: string;
  color: string | null;
  usageCount: number;
};

type NamedEntityManagementPageProps<T extends NamedEntity> = {
  entities: T[];
  title: string;
  description: string;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  // Forwarded to each NamedEntityRow.
  basePath: string;
  entityLabel: string;
  invalidateKeys: string[][];
  filterKey: "tags" | "sources";
};

/**
 * Shared management screen for "named entity" resources (tags, sources):
 * a heading, an empty state, and an editable list of NamedEntityRow items.
 */
export function NamedEntityManagementPage<T extends NamedEntity>({
  entities,
  title,
  description,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  basePath,
  entityLabel,
  invalidateKeys,
  filterKey,
}: NamedEntityManagementPageProps<T>) {
  const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure();

  return (
    <Container size="md" pt="md" pb="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Title order={2}>{title}</Title>
            <Text c="dimmed" size="sm">
              {description}
            </Text>
          </Stack>

          <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
            Add {entityLabel}
          </Button>
        </Group>

        {entities.length === 0 ? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <Stack gap="xs">
            {entities.map((entity) => (
              <NamedEntityRow
                key={entity.id}
                entity={entity}
                basePath={basePath}
                entityLabel={entityLabel}
                invalidateKeys={invalidateKeys}
                filterKey={filterKey}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <AddNamedEntityModal
        opened={addOpened}
        onClose={closeAdd}
        basePath={basePath}
        entityLabel={entityLabel}
        invalidateKeys={invalidateKeys}
      />
    </Container>
  );
}
