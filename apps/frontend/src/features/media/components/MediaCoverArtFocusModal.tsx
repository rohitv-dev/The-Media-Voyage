import { api, getApiErrorMessage } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/utils/notifications";
import {
  AspectRatio,
  Box,
  Button,
  Group,
  Image,
  Modal,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import type {
  MediaDetailedRecord,
  MediaImageFocus,
} from "@media-voyage/shared/api";
import { IconFocus2 } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { COVER_ART_SIZE_RATIOS } from "../hooks/useCoverArtSizePreference";
import type { CoverArtSize } from "../hooks/useCoverArtSizePreference";
import { getDefaultImageFocus, getImageObjectPosition } from "../imageFocus";

type FocusPoint = { x: number; y: number };

interface MediaCoverArtFocusModalProps {
  opened: boolean;
  onClose: () => void;
  mediaId: string;
  title: string;
  imageUrl: string | null;
  imageFocusX: number | null;
  imageFocusY: number | null;
  coverArtSize: CoverArtSize;
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function MediaCoverArtFocusModal({
  opened,
  onClose,
  mediaId,
  title,
  imageUrl,
  imageFocusX,
  imageFocusY,
  coverArtSize,
}: MediaCoverArtFocusModalProps) {
  const queryClient = useQueryClient();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [draftFocus, setDraftFocus] = useState<FocusPoint | null>(null);

  const defaultFocus = getDefaultImageFocus(coverArtSize);
  const effectiveFocus = draftFocus ?? defaultFocus;

  useEffect(() => {
    if (!opened) return;

    setDraftFocus(
      imageFocusX !== null && imageFocusY !== null
        ? { x: imageFocusX, y: imageFocusY }
        : null,
    );
  }, [opened, imageFocusX, imageFocusY]);

  const saveMutation = useMutation({
    mutationFn: (focus: MediaImageFocus) =>
      api<MediaDetailedRecord>(`/user-media/${mediaId}/image-focus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(focus),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.userMedia.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collection.itemsAll,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collection.itemsDetailedAll,
        }),
      ]);
      showSuccessNotification({
        title: "Cover crop updated",
        message: `${title} will use this focus point everywhere`,
      });
      onClose();
    },
    onError: (error: Error) =>
      showErrorNotification({
        title: "Could not update cover crop",
        message: getApiErrorMessage(error),
      }),
  });

  const updateFromPointer = (clientX: number, clientY: number) => {
    const rect = pickerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraftFocus({
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updateFromPointer(event.clientX, event.clientY);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    let nextFocus: FocusPoint | null = draftFocus ?? defaultFocus;

    if (event.key === "ArrowLeft")
      nextFocus = { ...nextFocus, x: clamp(nextFocus.x - step) };
    if (event.key === "ArrowRight")
      nextFocus = { ...nextFocus, x: clamp(nextFocus.x + step) };
    if (event.key === "ArrowUp")
      nextFocus = { ...nextFocus, y: clamp(nextFocus.y - step) };
    if (event.key === "ArrowDown")
      nextFocus = { ...nextFocus, y: clamp(nextFocus.y + step) };

    if (nextFocus !== (draftFocus ?? defaultFocus)) {
      event.preventDefault();
      setDraftFocus(nextFocus);
    }
  };

  const save = () => {
    saveMutation.mutate(
      draftFocus
        ? { imageFocusX: draftFocus.x, imageFocusY: draftFocus.y }
        : { imageFocusX: null, imageFocusY: null },
    );
  };

  const previewObjectPosition = getImageObjectPosition(coverArtSize, {
    imageFocusX: effectiveFocus.x,
    imageFocusY: effectiveFocus.y,
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Adjust cover crop"
      centered
      size="lg"
      closeOnClickOutside={!saveMutation.isPending}
      closeOnEscape={!saveMutation.isPending}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Click or drag the focus point onto the part of the image you want to
          keep visible. The same adjustment will be used across your cover sizes
          and shared views.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Stack gap="xs">
            <Group gap="xs">
              <IconFocus2 size={17} />
              <Text size="sm" fw={700}>
                Choose focus
              </Text>
            </Group>
            <Box
              ref={pickerRef}
              data-autofocus
              role="slider"
              tabIndex={0}
              aria-label={`Focus point for ${title}`}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={effectiveFocus.y}
              aria-valuetext={`${Math.round(effectiveFocus.x * 100)}% horizontal, ${Math.round(effectiveFocus.y * 100)}% vertical`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={handleKeyDown}
              style={{
                position: "relative",
                aspectRatio: "1 / 1",
                overflow: "hidden",
                borderRadius: "var(--mantine-radius-md)",
                background: "var(--mantine-color-dark-8)",
                cursor: "crosshair",
                touchAction: "none",
                outline: "none",
              }}
            >
              <Image
                src={imageUrl}
                alt=""
                w="100%"
                h="100%"
                fit="contain"
                draggable={false}
              />
              <Box
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: `${effectiveFocus.x * 100}%`,
                  top: `${effectiveFocus.y * 100}%`,
                  width: 28,
                  height: 28,
                  transform: "translate(-50%, -50%)",
                  border: "2px solid white",
                  borderRadius: "50%",
                  boxShadow: "0 1px 8px rgba(0, 0, 0, 0.55)",
                  pointerEvents: "none",
                }}
              />
            </Box>
            <Text size="xs" c="dimmed">
              Arrow keys also move the focus point. Hold Shift to move faster.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text size="sm" fw={700}>
              Card preview
            </Text>
            <AspectRatio ratio={COVER_ART_SIZE_RATIOS[coverArtSize]}>
              <Image
                src={imageUrl}
                alt={`${title} crop preview`}
                fit="cover"
                style={{ objectPosition: previewObjectPosition }}
              />
            </AspectRatio>
            <Text size="xs" c="dimmed">
              Previewing your current “{coverArtSize}” cover size.
            </Text>
          </Stack>
        </SimpleGrid>

        <Group justify="flex-end" mt="xs">
          <Group gap="sm">
            <Button
              variant="default"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={save} loading={saveMutation.isPending}>
              Save crop
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
