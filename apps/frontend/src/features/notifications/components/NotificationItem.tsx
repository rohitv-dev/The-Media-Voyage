import type { NotificationRecord } from "@media-voyage/shared/api";
import {
  IconMessageCircle,
  IconSend,
  IconThumbDown,
  IconThumbUp,
  IconUserCheck,
  IconUserPlus,
} from "@tabler/icons-react";
import {
  Avatar,
  Box,
  Group,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import dayjs from "dayjs";

interface NotificationItemProps {
  notification: NotificationRecord;
  onClick: () => void;
}

function formatRecommendationOutcome(
  outcome: NotificationRecord["recommendationOutcome"],
) {
  switch (outcome) {
    case "added_to_library":
      return "added to their library";
    case "already_completed":
      return "already completed";
    case "not_interested":
      return "wasn't interested in";
    case "dismissed":
      return "dismissed";
    default:
      return "responded to your recommendation";
  }
}

function getNotificationDetails(notification: NotificationRecord) {
  switch (notification.type) {
    case "media_like":
      return {
        icon: <IconThumbUp size={11} />,
        color: "teal",
        message: "liked",
      };
    case "media_dislike":
      return {
        icon: <IconThumbDown size={11} />,
        color: "red",
        message: "disliked",
      };
    case "media_comment":
      return {
        icon: <IconMessageCircle size={11} />,
        color: "blue",
        message: "commented on",
      };
    case "friend_request":
      return {
        icon: <IconUserPlus size={11} />,
        color: "grape",
        message: "sent you a friend request",
      };
    case "friend_request_accepted":
      return {
        icon: <IconUserCheck size={11} />,
        color: "teal",
        message: "accepted your friend request",
      };
    case "friend_recommendation":
      return {
        icon: <IconSend size={11} />,
        color: "orange",
        message: "recommended",
      };
    case "friend_recommendation_response":
      return {
        icon: <IconMessageCircle size={11} />,
        color: "blue",
        message: formatRecommendationOutcome(
          notification.recommendationOutcome,
        ),
      };
    case "system_recommendation":
      return {
        icon: <IconSend size={11} />,
        color: "violet",
        message: "recommended for you",
      };
  }
}

export function NotificationItem({
  notification,
  onClick,
}: NotificationItemProps) {
  const details = getNotificationDetails(notification);
  const hasMedia = Boolean(notification.mediaTitle);

  return (
    <UnstyledButton
      w="100%"
      p="sm"
      onClick={onClick}
      style={{ borderRadius: "var(--mantine-radius-sm)", textAlign: "left" }}
    >
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <Box pos="relative" style={{ flexShrink: 0 }}>
          <Avatar
            src={notification.actorImage}
            name={notification.actorName}
            color="accent"
            radius="xl"
            size={38}
          />
          <ThemeIcon
            color={details.color}
            radius="xl"
            size={18}
            pos="absolute"
            right={-3}
            bottom={-3}
            style={{
              border: "2px solid var(--mantine-color-body)",
            }}
          >
            {details.icon}
          </ThemeIcon>
        </Box>

        <Stack gap={3} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" lh={1.35}>
            <Text span fw={600}>
              {notification.actorName}
            </Text>{" "}
            {details.message}
            {hasMedia && (
              <>
                {" "}
                <Text span fw={500}>
                  {notification.mediaTitle}
                </Text>
              </>
            )}
            .
          </Text>
          <Text size="xs" c="dimmed">
            {dayjs(notification.createdAt).format("MMM D, YYYY · h:mm A")}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}
