import {
  friendships,
  userMedia,
  userMediaComments,
  userMediaReactions,
} from "@media-voyage/shared";
import type {
  CommentFormInput,
  FriendRespondInput,
  ReactionInput,
  ShareLibraryInput,
} from "@media-voyage/shared/api";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../../db/db";
import { badRequest, conflict, forbidden, notFound } from "../../../errors";
import { createNotification } from "../notifications/service";
import {
  findUserByEmail,
  friendshipBetween,
  requireViewableUserMedia,
} from "./queries";
import { resolveFriendRequest } from "./policy";

/**
 * Sends a request by email. If the other person already has a pending request
 * out to us, this accepts theirs instead of creating a second, mirrored row.
 */
export async function sendFriendRequest(userId: string, email: string) {
  const target = await findUserByEmail(email);

  if (!target) {
    throw notFound("No account is registered with that email address");
  }

  if (target.id === userId) {
    throw badRequest("You can't send a friend request to yourself");
  }

  const existing = await friendshipBetween(userId, target.id);
  const outcome = resolveFriendRequest(userId, existing);

  switch (outcome.type) {
    case "already_friends":
      throw conflict(`You and ${target.name} are already friends`);

    case "already_requested":
      throw conflict(`You already have a pending request to ${target.name}`);

    case "accept_existing": {
      const accepted = await db.transaction(async (tx) => {
        const [friendship] = await tx
          .update(friendships)
          .set({ status: "accepted", respondedAt: new Date() })
          .where(eq(friendships.id, outcome.friendshipId))
          .returning();

        await createNotification(tx, {
          recipientId: target.id,
          actorId: userId,
          type: "friend_request_accepted",
        });

        return friendship;
      });

      return { friendship: accepted, autoAccepted: true };
    }

    // A previously declined pair is replaced outright, so the new request is
    // always stored with the current requester on the requester side.
    case "replace_existing":
    case "create": {
      const friendship = await db.transaction(async (tx) => {
        if (outcome.type === "replace_existing") {
          await tx
            .delete(friendships)
            .where(eq(friendships.id, outcome.friendshipId));
        }

        const [created] = await tx
          .insert(friendships)
          .values({
            requesterId: userId,
            addresseeId: target.id,
            status: "pending",
          })
          .returning();

        await createNotification(tx, {
          recipientId: target.id,
          actorId: userId,
          type: "friend_request",
        });

        return created;
      });

      return { friendship, autoAccepted: false };
    }
  }
}

export async function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  { action }: FriendRespondInput,
) {
  const [existing] = await db
    .select()
    .from(friendships)
    .where(eq(friendships.id, friendshipId))
    .limit(1);

  if (!existing) throw notFound("Friend request not found");

  // Only the person who received the request gets to answer it.
  if (existing.addresseeId !== userId) {
    throw notFound("Friend request not found");
  }

  if (existing.status !== "pending") {
    throw conflict("That request has already been answered");
  }

  const updated = await db.transaction(async (tx) => {
    const [friendship] = await tx
      .update(friendships)
      .set({
        status: action === "accept" ? "accepted" : "declined",
        respondedAt: new Date(),
      })
      .where(eq(friendships.id, friendshipId))
      .returning();

    if (action === "accept") {
      await createNotification(tx, {
        recipientId: existing.requesterId,
        actorId: userId,
        type: "friend_request_accepted",
      });
    }

    return friendship;
  });

  return updated;
}

/**
 * Removes the friendship row in either direction — used for unfriending,
 * cancelling an outgoing request, and clearing a declined one. Reactions and
 * comments are intentionally left untouched.
 */
export async function removeFriendship(userId: string, otherUserId: string) {
  const existing = await friendshipBetween(userId, otherUserId);

  if (!existing) throw notFound("No friendship found with that person");

  await db.delete(friendships).where(eq(friendships.id, existing.id));

  return { removed: true };
}

export async function setReaction(
  viewerId: string,
  userMediaId: string,
  { value }: ReactionInput,
) {
  const entry = await requireViewableUserMedia(viewerId, userMediaId);

  if (value === null) {
    await db
      .delete(userMediaReactions)
      .where(
        and(
          eq(userMediaReactions.userMediaId, userMediaId),
          eq(userMediaReactions.userId, viewerId),
        ),
      );

    return { value: null };
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ value: userMediaReactions.value })
      .from(userMediaReactions)
      .where(
        and(
          eq(userMediaReactions.userMediaId, userMediaId),
          eq(userMediaReactions.userId, viewerId),
        ),
      )
      .limit(1);

    await tx
      .insert(userMediaReactions)
      .values({ userMediaId, userId: viewerId, value })
      .onConflictDoUpdate({
        target: [userMediaReactions.userMediaId, userMediaReactions.userId],
        set: { value, updatedAt: new Date() },
      });

    if (entry.ownerId !== viewerId && existing?.value !== value) {
      await createNotification(tx, {
        recipientId: entry.ownerId,
        actorId: viewerId,
        type: value === 1 ? "media_like" : "media_dislike",
        userMediaId,
      });
    }

    return { value };
  });
}

export async function addComment(
  viewerId: string,
  userMediaId: string,
  { body }: CommentFormInput,
) {
  const entry = await requireViewableUserMedia(viewerId, userMediaId);

  return db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(userMediaComments)
      .values({ userMediaId, userId: viewerId, body })
      .returning();

    if (entry.ownerId !== viewerId) {
      await createNotification(tx, {
        recipientId: entry.ownerId,
        actorId: viewerId,
        type: "media_comment",
        userMediaId,
      });
    }

    return comment;
  });
}

/** Deletable by the comment's author or by the owner of the entry. */
export async function deleteComment(viewerId: string, commentId: string) {
  const [existing] = await db
    .select({
      id: userMediaComments.id,
      authorId: userMediaComments.userId,
      ownerId: userMedia.userId,
    })
    .from(userMediaComments)
    .innerJoin(userMedia, eq(userMedia.id, userMediaComments.userMediaId))
    .where(eq(userMediaComments.id, commentId))
    .limit(1);

  if (!existing) throw notFound("Comment not found");

  if (existing.authorId !== viewerId && existing.ownerId !== viewerId) {
    throw forbidden("You can only delete your own comments");
  }

  await db.delete(userMediaComments).where(eq(userMediaComments.id, commentId));

  return { removed: true };
}

/** One-shot bulk visibility change over the caller's own library. */
export async function shareLibrary(
  userId: string,
  { visibility, onlyPrivate }: ShareLibraryInput,
) {
  const updated = await db
    .update(userMedia)
    .set({ visibility, updatedAt: new Date() })
    .where(
      and(
        eq(userMedia.userId, userId),
        isNull(userMedia.deletedAt),
        ...(onlyPrivate
          ? [inArray(userMedia.visibility, ["private"])]
          : []),
      ),
    )
    .returning({ id: userMedia.id });

  return { updated: updated.length };
}
