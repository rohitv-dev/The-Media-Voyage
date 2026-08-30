import { user } from "@media-voyage/shared";
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
