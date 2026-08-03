import { Group, Paper, Text, ThemeIcon } from "@mantine/core";

export function MessagePanel({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper withBorder p="sm">
      <Group gap="xs" mb={4}>
        <ThemeIcon variant="light" size={24} radius="xl">
          {icon}
        </ThemeIcon>
        <Text size="xs" fw={800} tt="uppercase" c="dimmed">
          {label}
        </Text>
      </Group>
      <Text size="sm" lh={1.55} style={{ whiteSpace: "pre-wrap" }}>
        {children}
      </Text>
    </Paper>
  );
}
