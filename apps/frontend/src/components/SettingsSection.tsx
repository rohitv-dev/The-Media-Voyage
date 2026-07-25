import { Card, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * Bordered settings group: a bold heading, a dimmed explanation, and the
 * rows beneath it. Pair with `SettingRow` for each individual control.
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="sm">
        <Stack gap={3}>
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Stack>
        {children}
      </Stack>
    </Card>
  );
}

/**
 * One labelled setting: name and hint on the left, control on the right,
 * wrapping to stacked layout on narrow screens.
 */
export function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md">
      <Stack gap={2} flex={1} miw={200}>
        <Text size="sm" fw={600}>
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
      {children}
    </Group>
  );
}
