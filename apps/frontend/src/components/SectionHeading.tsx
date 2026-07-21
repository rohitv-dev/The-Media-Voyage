import { Text, Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";

export function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Group gap="xs" align="center" wrap="nowrap">
      {icon}
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fw={600} size="lg">
          {title}
        </Text>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      </Stack>
    </Group>
  );
}