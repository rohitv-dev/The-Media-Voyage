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
import {
  findUserByEmail,
  friendshipBetween,
  requireViewableUserMedia,
} from "./queries";

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

  if (existing?.status === "accepted") {
    throw conflict(`You and ${target.name} are already friends`);
  }

  if (existing?.status === "pending") {
    if (existing.requesterId === userId) {
      throw conflict(`You already have a pending request to ${target.name}`);
    }

    // They asked first — accept rather than creating a second row.
    const [accepted] = await db
      .update(friendships)
      .set({ status: "accepted", respondedAt: new Date() })
      .where(eq(friendships.id, existing.id))
      .returning();

    return { friendship: accepted, autoAccepted: true };
  }

  // A previously declined pair is replaced outright, so the new request is
  // always stored with the current requester on the requester side.
  const [friendship] = await db.transaction(async (tx) => {
    if (existing) {
      await tx.delete(friendships).where(eq(friendships.id, existing.id));
    }

    return tx
      .insert(friendships)
      .values({
        requesterId: userId,
        addresseeId: target.id,
        status: "pending",
      })
      .returning();
  });

  return { friendship, autoAccepted: false };
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

  const [updated] = await db
    .update(friendships)
    .set({
      status: action === "accept" ? "accepted" : "declined",
      respondedAt: new Date(),
    })
    .where(eq(friendships.id, friendshipId))
    .returning();

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
  await requireViewableUserMedia(viewerId, userMediaId);

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

  await db
    .insert(userMediaReactions)
    .values({ userMediaId, userId: viewerId, value })
    .onConflictDoUpdate({
      target: [userMediaReactions.userMediaId, userMediaReactions.userId],
      set: { value, updatedAt: new Date() },
    });

  return { value };
}

export async function addComment(
  viewerId: string,
  userMediaId: string,
  { body }: CommentFormInput,
) {
  await requireViewableUserMedia(viewerId, userMediaId);

  const [comment] = await db
    .insert(userMediaComments)
    .values({ userMediaId, userId: viewerId, body })
    .returning();

  return comment;
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
