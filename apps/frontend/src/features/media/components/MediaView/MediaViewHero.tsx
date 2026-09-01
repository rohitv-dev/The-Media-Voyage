import { capitalizeWords } from "#/utils/strings";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Image,
  Loader,
  Menu,
  Modal,
  Progress,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useHover } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconHeartFilled,
  IconPencil,
  IconPhotoEdit,
  IconPlayerPlay,
  IconSend,
} from "@tabler/icons-react";
import type { UserMediaQuickAction } from "@media-voyage/shared/api";
import { visibilityEnumValues } from "@media-voyage/shared/userMediaSchema";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { useAppReducedMotion } from "#/hooks/useAppReducedMotion";
import { useCoverArtSizePreference } from "#/features/media/hooks/useCoverArtSizePreference";
import { useTagColorMap } from "#/features/named-entities/queries";
import { MediaCoverArtFocusModal } from "../MediaCoverArtFocusModal";
import { accentText } from "./constants";
import type { MediaViewData } from "./index";
import { getProgress } from "./utils";
import { getImageObjectPosition } from "../../imageFocus";

function ExpandableDescription({
  text,
  reducedMotion,
}: {
  text: string;
  reducedMotion: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [heights, setHeights] = useState({ collapsed: 0, full: 0 });
  const { hovered, ref: hoverRef } = useHover<HTMLButtonElement>();
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || 0;
    const collapsed = lineHeight * 3;
    const full = element.scrollHeight;
    setHeights({ collapsed, full });
    setOverflowing(full - collapsed > 1);
  }, [text]);

  const showFull = expanded || !overflowing;

  return (
    <Box maw={680} mt={{ base: "sm", sm: "md" }}>
      <motion.div
        style={{ overflow: "hidden" }}
        initial={false}
        animate={{ height: showFull ? heights.full : heights.collapsed }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }
        }
      >
        <Text ref={textRef} c="dimmed" size="sm" lh={1.65}>
          {text}
        </Text>
      </motion.div>
      {overflowing && (
        <UnstyledButton
          ref={hoverRef}
          mt={4}
          onClick={() => setExpanded((previous) => !previous)}
        >
          <Text size="xs" fw={hovered ? 800 : 600} c="primary">
            {expanded ? "Read less" : "Read more"}
          </Text>
        </UnstyledButton>
      )}
    </Box>
  );
}

type MediaViewHeroProps = {
  data: MediaViewData;
  readOnly?: boolean;
  onBack?: () => void;
  onEdit?: () => void;
  backLabel?: string;
  eyebrow?: string;
  onCopyToLibrary?: () => void;
  copyingToLibrary?: boolean;
  onRecommendToFriend?: () => void;
  onCopyPublicLink?: () => void;
  copyingPublicLink?: boolean;
  onQuickAction?: (action: UserMediaQuickAction) => void;
  quickActionPending?: boolean;
};

export function MediaViewHero({
  data,
  readOnly,
  onBack,
  onEdit,
  backLabel = "Back to library",
  eyebrow,
  onCopyToLibrary,
  copyingToLibrary,
  onRecommendToFriend,
  onCopyPublicLink,
  copyingPublicLink,
  onQuickAction,
  quickActionPending,
}: MediaViewHeroProps) {
  const navigate = useNavigate();
  const [coverEditorOpen, setCoverEditorOpen] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [coverArtSize] = useCoverArtSizePreference();
  const reducedMotion = useAppReducedMotion();
  const tagColorMap = useTagColorMap();
  const progress = getProgress(data.progress);
  const canAdjustCover = Boolean(!readOnly && data.imageUrl);
  const hasSecondaryActions =
    canAdjustCover ||
    (!readOnly && Boolean(onRecommendToFriend)) ||
    (!readOnly && Boolean(onCopyPublicLink)) ||
    (!readOnly && Boolean(onQuickAction));
  const activeVisibility = data.visibility ?? "private";
  const coverImage = (
    <Image
      src={data.imageUrl}
      alt={data.title}
      radius="sm"
      fit="cover"
      fallbackSrc="https://placehold.co/336x504?text=No+Image"
      style={{
        width: "100%",
        aspectRatio: "2 / 3",
        objectPosition: getImageObjectPosition("full", data),
        boxShadow:
          "light-dark(0 14px 26px rgba(31, 41, 55, 0.16), 0 18px 34px rgba(0, 0, 0, 0.42))",
      }}
    />
  );

  return (
    <>
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        px={0}
        fw={600}
        style={{ alignSelf: "flex-start" }}
        onClick={() => (onBack ? onBack() : navigate({ to: "/media" }))}
      >
        {backLabel}
      </Button>

      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          withBorder
          p={{ base: "sm", sm: "lg" }}
          style={{
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Grid
            gap={{ base: "sm", sm: "lg" }}
            align="flex-start"
            pos="relative"
          >
            <Grid.Col span={{ base: 4, xs: 3, sm: 3 }}>
              {data.imageUrl ? (
                <UnstyledButton
                  type="button"
                  aria-label={`Enlarge ${data.title} image`}
                  onClick={() => setImageViewerOpen(true)}
                  style={{
                    display: "block",
                    width: "100%",
                    cursor: "zoom-in",
                    lineHeight: 0,
                  }}
                >
                  {coverImage}
                </UnstyledButton>
              ) : (
                coverImage
              )}
            </Grid.Col>

            <Grid.Col span={{ base: 8, xs: 9, sm: 9 }}>
              <Stack gap={0} h="100%">
                <Text
                  size="xs"
                  fw={800}
                  tt="uppercase"
                  mb="xs"
                  style={{ letterSpacing: "0.05em", color: accentText }}
                >
                  {eyebrow ?? `${capitalizeWords(data.type)} / library entry`}
                </Text>

                <Group
                  align="flex-start"
                  justify="space-between"
                  gap="md"
                  wrap="wrap"
                >
                  <Title
                    order={1}
                    fz={{ base: 28, sm: 48 }}
                    lh={1}
                    lts="-0.045em"
                    maw={650}
                    style={{ overflowWrap: "anywhere", flex: "1 1 220px" }}
                  >
                    {data.title}
                  </Title>
                  {!readOnly && (
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      w={{ base: "100%", xs: "auto" }}
                    >
                      <Button
                        flex={1}
                        leftSection={<IconEdit size={16} />}
                        onClick={() =>
                          onEdit
                            ? onEdit()
                            : navigate({
                                to: "/media/update/$id",
                                params: { id: data.id },
                              })
                        }
                      >
                        Update
                      </Button>
                      {hasSecondaryActions && (
                        <Menu position="bottom-end" shadow="md" withinPortal>
                          <Menu.Target>
                            <ActionIcon
                              variant="light"
                              size="md"
                              aria-label="More actions"
                            >
                              <IconDotsVertical size={18} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            {canAdjustCover && (
                              <Menu.Item
                                leftSection={<IconPhotoEdit size={16} />}
                                onClick={() => setCoverEditorOpen(true)}
                              >
                                Adjust cover
                              </Menu.Item>
                            )}
                            {onQuickAction && (
                              <Menu.Sub>
                                <Menu.Sub.Target>
                                  <Menu.Sub.Item disabled={quickActionPending}>
                                    Toggle Visibility
                                  </Menu.Sub.Item>
                                </Menu.Sub.Target>
                                <Menu.Sub.Dropdown>
                                  {[...visibilityEnumValues]
                                    .reverse()
                                    .map((visibility) => (
                                      <Menu.Item
                                        key={visibility}
                                        rightSection={
                                          activeVisibility === visibility ? (
                                            <IconCheck size={15} />
                                          ) : undefined
                                        }
                                        disabled={quickActionPending}
                                        onClick={() =>
                                          onQuickAction({ visibility })
                                        }
                                      >
                                        {capitalizeWords(visibility)}
                                      </Menu.Item>
                                    ))}
                                </Menu.Sub.Dropdown>
                              </Menu.Sub>
                            )}
                            {onRecommendToFriend && (
                              <Menu.Item
                                leftSection={<IconSend size={16} />}
                                onClick={onRecommendToFriend}
                              >
                                Recommend
                              </Menu.Item>
                            )}
                            {onCopyPublicLink && (
                              <Menu.Item
                                leftSection={<IconCopy size={16} />}
                                rightSection={
                                  copyingPublicLink ? (
                                    <Loader size="xs" />
                                  ) : undefined
                                }
                                disabled={copyingPublicLink}
                                onClick={onCopyPublicLink}
                              >
                                Copy public link
                              </Menu.Item>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      )}
                    </Group>
                  )}
                  {readOnly && onCopyToLibrary && (
                    <Button
                      w={{ base: "100%", xs: "auto" }}
                      flex="0 0 auto"
                      leftSection={<IconCopy size={16} />}
                      loading={copyingToLibrary}
                      onClick={onCopyToLibrary}
                    >
                      Copy to my library
                    </Button>
                  )}
                </Group>

                <Group gap={6} mt={{ base: "sm", sm: "md" }}>
                  <Badge variant="light" size="sm">
                    {capitalizeWords(data.status)}
                  </Badge>
                  {data.visibility && (
                    <Badge variant="outline" size="sm">
                      {capitalizeWords(data.visibility)}
                    </Badge>
                  )}
                  {data.favorite && (
                    <Badge
                      leftSection={<IconHeartFilled size={12} />}
                      size="sm"
                    >
                      Favorite
                    </Badge>
                  )}
                  {data.catalogSource === "manual" && (
                    <Tooltip label="This title was entered manually and isn't matched to a verified catalog entry, so it has no synced poster or description">
                      <Badge
                        variant="outline"
                        leftSection={<IconPencil size={12} />}
                        size="sm"
                      >
                        Manually added
                      </Badge>
                    </Tooltip>
                  )}
                </Group>

                {data.tags.length > 0 && (
                  <Group gap={6} mt="sm">
                    {data.tags.map((tag) => (
                      <Badge
                        key={tag}
                        radius="xl"
                        variant="dot"
                        color={tagColorMap.get(tag) ?? "gray"}
                        size="sm"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                )}

                <ExpandableDescription
                  text={
                    data.description?.trim() ||
                    "No description available for this media item."
                  }
                  reducedMotion={reducedMotion}
                />

                <Box maw={480} mt="auto" pt={{ base: "md", sm: "xl" }}>
                  <Group justify="space-between" gap="xs" mb={6}>
                    <Group gap={6}>
                      <ThemeIcon variant="transparent" c="primary" size={18}>
                        {progress === 100 ? (
                          <IconCheck size={15} stroke={2.5} />
                        ) : (
                          <IconPlayerPlay size={15} stroke={2.5} />
                        )}
                      </ThemeIcon>
                      <Text size="xs" fw={700}>
                        {progress === 100
                          ? "Completed"
                          : readOnly
                            ? "Progress"
                            : "Your progress"}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" fw={700}>
                      {progress}%
                    </Text>
                  </Group>
                  <Progress
                    value={progress}
                    size="sm"
                    radius="xl"
                    c="primary"
                  />
                </Box>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>
      </motion.div>

      {data.imageUrl && (
        <Modal
          opened={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
          centered
          size="auto"
          withCloseButton={false}
          padding={0}
          styles={{
            content: {
              background: "transparent",
              boxShadow: "none",
            },
            body: { padding: 0 },
          }}
        >
          <Image
            src={data.imageUrl}
            alt={data.title}
            fit="contain"
            style={{
              display: "block",
              maxWidth: "90vw",
              maxHeight: "90vh",
              width: "auto",
              height: "auto",
            }}
          />
        </Modal>
      )}

      {!readOnly && data.imageUrl && (
        <MediaCoverArtFocusModal
          opened={coverEditorOpen}
          onClose={() => setCoverEditorOpen(false)}
          mediaId={data.id}
          title={data.title}
          imageUrl={data.imageUrl}
          imageFocusX={data.imageFocusX}
          imageFocusY={data.imageFocusY}
          coverArtSize={coverArtSize}
        />
      )}
    </>
  );
}
