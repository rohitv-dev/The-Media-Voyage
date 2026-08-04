import {
  Group,
  Paper,
  SimpleGrid,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconNotebook, IconQuote } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import type { ReactNode } from "react";
import { defaultBorder } from "./constants";
import type { MediaViewData } from "./index";

function ReadingPanel({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const reducedMotion = useAppReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={reducedMotion ? undefined : { y: -3 }}
      transition={{ duration: 0.25, delay: 0.12 }}
      style={{ height: "100%" }}
    >
      <Paper
        withBorder
        p={{ base: "md", sm: "lg" }}
        h="100%"
        style={{ borderColor: defaultBorder }}
      >
        <Group gap="xs" mb="md">
          <ThemeIcon variant="light" c="primary" size={30} radius="sm">
            {icon}
          </ThemeIcon>
          <Title order={4}>{title}</Title>
        </Group>
        <Text size="sm" lh={1.75} style={{ whiteSpace: "pre-wrap" }}>
          {children}
        </Text>
      </Paper>
    </motion.div>
  );
}

export function MediaViewReadingPanels({ data }: { data: MediaViewData }) {
  const showNotes = data.notes !== undefined;

  return (
    <SimpleGrid cols={{ base: 1, sm: showNotes ? 2 : 1 }} spacing="md">
      <ReadingPanel icon={<IconQuote size={17} />} title="Review">
        {data.review?.trim() || "No review has been added yet."}
      </ReadingPanel>
      {showNotes && (
        <ReadingPanel icon={<IconNotebook size={17} />} title="Notes">
          {data.notes?.trim() || "No notes have been added yet."}
        </ReadingPanel>
      )}
    </SimpleGrid>
  );
}
