import { Button, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import { AnimatePresence, motion } from "motion/react";
import type { MediaRecord } from "@media-voyage/shared/api";
import { ContinueMediaCard } from "#/features/media/components/ContinueMediaCard";
import { EmptyState } from "#/components/EmptyState";
import { IconArrowRight, IconPlayerPlay } from "@tabler/icons-react";
import { gridItemMotionProps } from "#/theme/motion";

export function DashboardContinue({
  items,
  reduceMotion,
  onViewAll,
  onView,
}: {
  items: MediaRecord[];
  reduceMotion: boolean;
  onViewAll: () => void;
  onView: (id: string) => void;
}) {
  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Title order={3}>Continue</Title>
        <Button
          variant="subtle"
          size="sm"
          rightSection={<IconArrowRight size={15} />}
          onClick={onViewAll}
        >
          View all
        </Button>
      </Group>

      {items.length === 0 ? (
        <EmptyState
          radius="md"
          icon={<IconPlayerPlay size={32} />}
          title="Nothing in progress"
          description="Start or resume something from your library to see it here."
        />
      ) : (
        <SimpleGrid
          spacing={{ base: "xs", sm: "sm" }}
          cols={{ base: 1, sm: 2, md: 3 }}
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div key={item.id} {...gridItemMotionProps(reduceMotion)}>
                <ContinueMediaCard media={item} onView={onView} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SimpleGrid>
      )}
    </Stack>
  );
}
