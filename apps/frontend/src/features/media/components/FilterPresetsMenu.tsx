import { ActionIcon, Button, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBookmark,
  IconDeviceFloppy,
  IconTrash,
} from "@tabler/icons-react";
import type { UserMediaQuerySchema } from "@media-voyage/shared/api";
import type { FilterPreset } from "#/features/media/hooks/useFilterPresets";
import { SavePresetModal } from "#/features/media/components/SavePresetModal";
import { showSuccessNotification } from "#/utils/notifications";
import { confirmDelete } from "#/utils/confirmModal";

type FilterPresetsMenuProps = {
  presets: FilterPreset[];
  onApply: (filters: UserMediaQuerySchema) => void;
  onSave: (name: string) => { ok: boolean; error?: string };
  onDelete: (id: string) => void;
};

export function FilterPresetsMenu({
  presets,
  onApply,
  onSave,
  onDelete,
}: FilterPresetsMenuProps) {
  const [saveModalOpened, { open: openSaveModal, close: closeSaveModal }] =
    useDisclosure();

  const handleDelete = (preset: FilterPreset) => {
    confirmDelete({
      title: "Delete preset",
      message: `Are you sure you want to delete the preset "${preset.name}"?`,
      onConfirm: () => {
        onDelete(preset.id);
        showSuccessNotification({
          message: `Deleted preset "${preset.name}"`,
        });
      },
    });
  };

  return (
    <>
      <Menu shadow="md" width={240} position="bottom-start">
        <Menu.Target>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconBookmark size={16} />}
          >
            Presets
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Saved presets</Menu.Label>

          {presets.length === 0 && (
            <Menu.Item disabled>No saved presets yet</Menu.Item>
          )}

          {presets.map((preset) => (
            <Menu.Item
              key={preset.id}
              onClick={() => onApply(preset.filters)}
              rightSection={
                <ActionIcon
                  size="xs"
                  color="gray"
                  variant="subtle"
                  aria-label={`Delete preset ${preset.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(preset);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              }
            >
              {preset.name}
            </Menu.Item>
          ))}

          <Menu.Divider />

          <Menu.Item
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={openSaveModal}
          >
            Save current filters...
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <SavePresetModal
        opened={saveModalOpened}
        onClose={closeSaveModal}
        onSave={(name) => onSave(name)}
      />
    </>
  );
}
