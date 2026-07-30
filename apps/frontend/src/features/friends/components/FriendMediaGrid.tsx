import { MediaCard } from "#/features/media/components/MediaCard";
import { Group, SimpleGrid, Text } from "@mantine/core";
import type { FriendMediaRecord } from "@media-voyage/shared/api";
import {
  IconMessageCircle,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { gridItemMotionProps } from "#/theme/motion";

function SocialCounts({ record }: { record: FriendMediaRecord }) {
  return (
    <Group gap="sm" wrap="nowrap" c="dimmed">
      <Group gap={4} wrap="nowrap">
        <IconThumbUp size={15} />
        <Text size="xs">{record.likeCount}</Text>
      </Group>
      <Group gap={4} wrap="nowrap">
        <IconThumbDown size={15} />
        <Text size="xs">{record.dislikeCount}</Text>
      </Group>
      <Group gap={4} wrap="nowrap">
        <IconMessageCircle size={15} />
        <Text size="xs">{record.commentCount}</Text>
      </Group>
    </Group>
  );
}

/**
 * Read-only grid of friends' entries, shared by the activity feed and a single
 * friend's library. Reuses MediaCard with quick actions and Edit suppressed.
 */
export function FriendMediaGrid({
  records,
  showOwner,
}: {
  records: FriendMediaRecord[];
  /** Prefix each title's meta line with whose entry it is (feed view). */
  showOwner?: boolean;
}) {
  const navigate = useNavigate();
  const reduceMotion = useAppReducedMotion();

  return (
    <SimpleGrid
      spacing={{ base: "xs", md: "md" }}
      cols={{ base: 1, sm: 2, lg: 3, xl: 4 }}
    >
      <AnimatePresence mode="popLayout">
        {records.map((record) => (
          <motion.div key={record.id} {...gridItemMotionProps(reduceMotion)}>
            {showOwner && (
              <Text size="xs" c="dimmed" fw={600} mb={4}>
                {record.ownerName}
              </Text>
            )}
            <MediaCard
              media={record}
              readOnly
              footerRight={<SocialCounts record={record} />}
              onView={(id) =>
                navigate({
                  to: "/friends/media/$id",
                  params: { id },
                  viewTransition: true,
                })
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </SimpleGrid>
  );
}
