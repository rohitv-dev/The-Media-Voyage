import { recommendationOutcomeEnum, user } from "@media-voyage/shared";
import { getApps, applicationDefault, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";

function getFirebaseMessaging() {
  const app =
    getApps()[0] ?? initializeApp({ credential: applicationDefault() });

  return getMessaging(app);
}

function getFirebaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

function isInvalidRegistrationToken(error: unknown) {
  const code = getFirebaseErrorCode(error);

  return (
    code === "messaging/invalid-registration-token" ||
    code === "messaging/registration-token-not-registered"
  );
}

type PushMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

type RecommendationOutcome =
  (typeof recommendationOutcomeEnum.enumValues)[number];

const recommendationResponseMessages: Record<RecommendationOutcome, string> = {
  added_to_library: "Your friend added your recommendation to their library.",
  already_completed: "Your friend already completed your recommendation.",
  not_interested: "Your friend wasn't interested in your recommendation.",
};

async function sendPushNotification(recipientId: string, message: PushMessage) {
  const [recipient] = await db
    .select({ deviceToken: user.deviceToken })
    .from(user)
    .where(eq(user.id, recipientId))
    .limit(1);
  const token = recipient?.deviceToken;

  if (!token) return;

  try {
    await getFirebaseMessaging().send({
      token,
      notification: {
        title: message.title,
        body: message.body,
      },
      data: message.data,
    });
  } catch (error) {
    if (!isInvalidRegistrationToken(error)) throw error;

    await db
      .update(user)
      .set({ deviceToken: null })
      .where(and(eq(user.id, recipientId), eq(user.deviceToken, token)));
  }
}

export function sendFriendRecommendationNotification(
  recipientId: string,
  recommendationId: string,
) {
  return sendPushNotification(recipientId, {
    title: "New recommendation",
    body: "A friend recommended something for you.",
    data: {
      type: "friend_recommendation",
      recommendationId,
    },
  });
}

export function sendFriendRequestNotification(
  recipientId: string,
  friendshipId: string,
) {
  return sendPushNotification(recipientId, {
    title: "New friend request",
    body: "Someone sent you a friend request.",
    data: {
      type: "friend_request",
      friendshipId,
    },
  });
}

export function sendFriendRequestAcceptedNotification(
  recipientId: string,
  friendshipId: string,
) {
  return sendPushNotification(recipientId, {
    title: "Friend request accepted",
    body: "Your friend request was accepted.",
    data: {
      type: "friend_request_accepted",
      friendshipId,
    },
  });
}

export function sendFriendRecommendationResponseNotification(
  recipientId: string,
  recommendationId: string,
  outcome: RecommendationOutcome,
) {
  return sendPushNotification(recipientId, {
    title: "Recommendation update",
    body: recommendationResponseMessages[outcome],
    data: {
      type: "friend_recommendation_response",
      recommendationId,
    },
  });
}

export function sendMediaCommentNotification(
  recipientId: string,
  userMediaId: string,
) {
  return sendPushNotification(recipientId, {
    title: "New comment",
    body: "Someone commented on your media.",
    data: {
      type: "media_comment",
      userMediaId,
    },
  });
}
