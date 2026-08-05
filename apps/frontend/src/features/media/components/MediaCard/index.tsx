import { useCoverArtPreference } from "#/features/media/hooks/useCoverArtPreference";
import { useCoverArtSizePreference } from "#/features/media/hooks/useCoverArtSizePreference";
import { useMediaCardActions } from "#/features/media/hooks/useMediaCardActions";
import { Card, Stack } from "@mantine/core";
import type { MediaRecord } from "@media-voyage/shared/api";
import { motion } from "motion/react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import { MediaCoverArtFocusModal } from "../MediaCoverArtFocusModal";
import { MediaCardContent } from "./MediaCardContent";
import { MediaCardCoverArt } from "./MediaCardCoverArt";
import { MediaCardFooter } from "./MediaCardFooter";
import { MediaCardQuickActions } from "./MediaCardQuickActions";

interface MediaCardProps {
  media: MediaRecord;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  readOnly?: boolean;
  /** Replaces the Edit button — used for social counts on friends' entries. */
  footerRight?: ReactNode;
}

export function MediaCard({
  media,
  onView,
  onEdit,
  readOnly,
  footerRight,
}: MediaCardProps) {
  const reduceMotion = useAppReducedMotion();
  const [showCoverArt] = useCoverArtPreference();
  const [coverArtSize] = useCoverArtSizePreference();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const { isActionPending, isDeletePending, requestDelete, runQuickAction } =
    useMediaCardActions(media);

  const openMedia = () => {
    if (coverEditorOpen) return;
    onView?.(media.id);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMedia();
    }
  };

  return (
    <Card
      component={motion.div}
      className="media-card"
      withBorder
      h="100%"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      role={onView ? "link" : undefined}
      tabIndex={onView ? 0 : undefined}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -4,
              zIndex: 1,
              boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
            }
      }
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      onClick={openMedia}
      onKeyDown={handleCardKeyDown}
      p={{ base: "sm", sm: "md" }}
      style={{
        cursor: onView ? "pointer" : undefined,
        position: "relative",
      }}
    >
      {showCoverArt && (
        <Card.Section>
          <MediaCardCoverArt
            imageUrl={media.imageUrl}
            coverArtSize={coverArtSize}
            imageFocusX={media.imageFocusX}
            imageFocusY={media.imageFocusY}
          />
        </Card.Section>
      )}

      <Stack
        justify="space-between"
        h="100%"
        gap="sm"
        mt={showCoverArt ? "sm" : "0"}
      >
        <MediaCardContent
          media={media}
          readOnly={readOnly}
          quickActions={
            !readOnly ? (
              <MediaCardQuickActions
                media={media}
                isPending={isActionPending}
                onAction={runQuickAction}
                onDelete={requestDelete}
                onEditCover={() => setCoverEditorOpen(true)}
              />
            ) : null
          }
        />
        <MediaCardFooter
          media={media}
          readOnly={readOnly}
          onEdit={onEdit}
          footerRight={footerRight}
          isActionPending={isActionPending}
          isDeletePending={isDeletePending}
          onDelete={requestDelete}
        />
      </Stack>

      <MediaCoverArtFocusModal
        opened={coverEditorOpen}
        onClose={() => setCoverEditorOpen(false)}
        mediaId={media.id}
        title={media.title}
        imageUrl={media.imageUrl}
        imageFocusX={media.imageFocusX}
        imageFocusY={media.imageFocusY}
        coverArtSize={coverArtSize}
      />
    </Card>
  );
}
