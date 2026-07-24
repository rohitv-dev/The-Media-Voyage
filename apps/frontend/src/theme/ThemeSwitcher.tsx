import {
  ActionIcon,
  Box,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import { useAppTheme } from "./ThemeProvider";
import { THEME_ORDER, THEMES  } from "./themes";
import type {ThemeId} from "./themes";

/** Three little colour chips previewing a theme's ground, surface and accent. */
function Swatch({ id }: { id: ThemeId }) {
  const t = THEMES[id];
  return (
    <Group
      gap={0}
      wrap="nowrap"
      style={{
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid var(--mantine-color-default-border)",
        flexShrink: 0,
      }}
    >
      {[t.bg, t.surface, t.accent].map((c, i) => (
        <Box key={i} w={14} h={22} style={{ background: c }} />
      ))}
    </Group>
  );
}

/** Full-width theme option — used inside the menu and on the profile page. */
export function ThemeOption({
  id,
  active,
  onSelect,
}: {
  id: ThemeId;
  active: boolean;
  onSelect: (id: ThemeId) => void;
}) {
  const t = THEMES[id];
  return (
    <UnstyledButton
      onClick={() => onSelect(id)}
      w="100%"
      p="xs"
      style={{
        borderRadius: "var(--mantine-radius-sm)",
        background: active ? "var(--mantine-primary-color-light)" : undefined,
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Swatch id={id} />
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} lh={1.25}>
            {t.label}
          </Text>
          <Text size="xs" c="dimmed" lh={1.25} lineClamp={1}>
            {t.blurb}
          </Text>
        </Stack>
        {active && (
          <IconCheck
            size={16}
            color="var(--mantine-primary-color-filled)"
            style={{ flexShrink: 0 }}
          />
        )}
      </Group>
    </UnstyledButton>
  );
}

/** The list of every theme — reused by the menu and the profile page. */
export function ThemeOptionsList() {
  const { themeId, setThemeId } = useAppTheme();
  return (
    <Stack gap={4}>
      {THEME_ORDER.map((id) => (
        <ThemeOption
          key={id}
          id={id}
          active={id === themeId}
          onSelect={setThemeId}
        />
      ))}
    </Stack>
  );
}

/** Compact icon-triggered menu for the app header. */
export function ThemeSwitcher() {
  const { themeId, setThemeId } = useAppTheme();

  return (
    <Menu position="bottom-end" shadow="md" width={280} withArrow>
      <Menu.Target>
        <Tooltip label="Change theme" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            aria-label="Change theme"
          >
            <IconPalette size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Theme</Menu.Label>
        <Box px={4} pb={4}>
          <Stack gap={2}>
            {THEME_ORDER.map((id) => (
              <ThemeOption
                key={id}
                id={id}
                active={id === themeId}
                onSelect={setThemeId}
              />
            ))}
          </Stack>
        </Box>
      </Menu.Dropdown>
    </Menu>
  );
}
