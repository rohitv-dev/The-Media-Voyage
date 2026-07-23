import { Card, Stack, Text } from "@mantine/core";
import type { MantineRadius } from "@mantine/core";
import type { ReactNode } from "react";

type EmptyStateProps = {
  /** Optional icon rendered above the title (caller controls size/stroke). */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Card radius; omit for the Mantine default. */
  radius?: MantineRadius;
  /** Optional actions (e.g. a button) rendered below the description. */
  children?: ReactNode;
};

/**
 * Bordered "nothing here yet" placeholder card used across list/detail views:
 * a centered icon, bold title, dimmed description, and optional actions.
 */
export function EmptyState({
  icon,
  title,
  description,
  radius,
  children,
}: EmptyStateProps) {
  return (
    <Card withBorder radius={radius} p="xl">
      <Stack align="center" gap="xs">
        {icon}
        <Text fw={600} ta="center">
          {title}
        </Text>
        {description ? (
          <Text c="dimmed" size="sm" ta="center">
            {description}
          </Text>
        ) : null}
        {children}
      </Stack>
    </Card>
  );
}
