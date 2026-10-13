import {
  Button,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { MediaRecord } from "@media-voyage/shared/api";
import { ContinueMediaCard } from "#/features/media/components/ContinueMediaCard";
import { EmptyState } from "#/components/EmptyState";
import { IconArrowRight, IconPlayerPlay } from "@tabler/icons-react";
import { gridItemMotionProps } from "#/theme/motion";

export function DashboardContinue({
  items,
  nearlyFinished,
  reduceMotion,
  onViewAll,
  onView,
}: {
  items: MediaRecord[];
  nearlyFinished: MediaRecord[];
  reduceMotion: boolean;
  onViewAll: () => void;
  onView: (id: string) => void;
}) {
  const [view, setView] = useState("recent");
  const showNearlyFinished = view === "nearly_finished";
  const visibleItems = showNearlyFinished ? nearlyFinished : items;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <Title order={3}>Continue</Title>
          <SegmentedControl
            size="xs"
            aria-label="Continue list"
            value={view}
            onChange={setView}
            data={[
              { label: "Recent", value: "recent" },
              { label: "Nearly Finished", value: "nearly_finished" },
            ]}
          />
        </Group>
        {!showNearlyFinished && (
          <Button
            variant="subtle"
            size="sm"
            rightSection={<IconArrowRight size={15} />}
            onClick={onViewAll}
          >
            View all
          </Button>
        )}
      </Group>

      {visibleItems.length === 0 ? (
        <EmptyState
          radius="md"
          icon={<IconPlayerPlay size={32} />}
          title={
            showNearlyFinished
              ? "No partially finished titles"
              : "Nothing in progress"
          }
          description={
            showNearlyFinished
              ? "Record 1–99% progress on an in-progress, playing, or revisiting title to see it here."
              : "Start or resume something from your library to see it here."
          }
        />
      ) : (
        <SimpleGrid
          spacing={{ base: "xs", sm: "sm" }}
          cols={{ base: 1, sm: 2, md: 3 }}
        >
          <AnimatePresence mode="popLayout">
            {visibleItems.map((item) => (
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
