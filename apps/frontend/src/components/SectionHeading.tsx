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
    <Group gap="sm" align="center" wrap="nowrap">
      {icon}
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text fw={600} fz={{ base: "md", md: "lg" }}>
          {title}
        </Text>
        <Text c="dimmed" fz={{ base: "xs", md: "sm" }}>
          {description}
        </Text>
      </Stack>
    </Group>
  );
}