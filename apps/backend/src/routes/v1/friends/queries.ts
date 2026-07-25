import {
  friendships,
  media,
  mediaCollection,
  mediaCollectionItems,
  user,
  userMedia,
  userMediaComments,
  userMediaReactions,
} from "@media-voyage/shared";
import type {
  FriendRecord,
  FriendRequestsResponse,
} from "@media-voyage/shared/api";
import { and, count, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../../../db/db";
import { notFound } from "../../../errors";
import { canView } from "./policy";
import {
  commentRecordSelect,
  friendMediaDetailedSelect,
  friendMediaSummarySelect,
  friendUserSelect,
  reactionRecordSelect,
} from "./selects";

/** Entries a non-owner may see, assuming they clear the friendship check. */
const SHARED_VISIBILITIES = ["friends", "public"] as const;

/**
 * A friendship is one directed row, so "is there anything between these two
 * people" has to look both ways. Every friendship read goes through here.
 */
export async function friendshipBetween(userId: string, otherUserId: string) {
  const [row] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, otherUserId),
        ),
        and(
          eq(friendships.requesterId, otherUserId),
          eq(friendships.addresseeId, userId),
        ),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function areFriends(userId: string, otherUserId: string) {
  if (userId === otherUserId) return true;

  const friendship = await friendshipBetween(userId, otherUserId);
  return friendship?.status === "accepted";
}

export async function listFriendIds(userId: string) {
  const rows = await db
    .select({
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId),
        ),
      ),
    );

  return rows.map((row) =>
    row.requesterId === userId ? row.addresseeId : row.requesterId,
  );
}

/**
 * Resolves the viewer's access to a single entry, or throws. Denied access
 * reports 404 rather than 403 so an outsider can't probe which ids exist.
 */
export async function requireViewableUserMedia(
  viewerId: string,
  userMediaId: string,
) {
  const [entry] = await db
    .select({
      id: userMedia.id,
      ownerId: userMedia.userId,
      visibility: userMedia.visibility,
    })
    .from(userMedia)
    .where(and(eq(userMedia.id, userMediaId), isNull(userMedia.deletedAt)))
    .limit(1);

  if (!entry) throw notFound("Entry not found");

  // Only pay for the friendship lookup when the rule actually depends on it.
  const isFriend =
    entry.ownerId !== viewerId && entry.visibility === "friends"
      ? await areFriends(viewerId, entry.ownerId)
      : false;

  if (!canView(viewerId, entry, isFriend)) {
    throw notFound("Entry not found");
  }

  return entry;
}

async function countSharedEntries(friendIds: string[]) {
  if (!friendIds.length) return new Map<string, number>();

  const rows = await db
    .select({ userId: userMedia.userId, total: count() })
    .from(userMedia)
    .where(
      and(
        inArray(userMedia.userId, friendIds),
        inArray(userMedia.visibility, [...SHARED_VISIBILITIES]),
        isNull(userMedia.deletedAt),
      ),
    )
    .groupBy(userMedia.userId);

  return new Map(rows.map((row) => [row.userId, row.total]));
}

export async function listFriends(userId: string): Promise<FriendRecord[]> {
  const rows = await db
    .select({
      friendshipId: friendships.id,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      since: friendships.respondedAt,
    })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(
          eq(friendships.requesterId, userId),
          eq(friendships.addresseeId, userId),
        ),
      ),
    );

  if (!rows.length) return [];

  const friendIdByFriendship = rows.map((row) => ({
    ...row,
    friendId: row.requesterId === userId ? row.addresseeId : row.requesterId,
  }));

  const friendIds = friendIdByFriendship.map((row) => row.friendId);

  const [profiles, sharedCounts] = await Promise.all([
    db.select(friendUserSelect).from(user).where(inArray(user.id, friendIds)),
    countSharedEntries(friendIds),
  ]);

  const profileById = new Map(
    profiles.map((profile) => [profile.userId, profile]),
  );

  return friendIdByFriendship
    .map((row) => {
      const profile = profileById.get(row.friendId);
      if (!profile) return null;

      return {
        ...profile,
        friendshipId: row.friendshipId,
        since: row.since,
        sharedCount: sharedCounts.get(row.friendId) ?? 0,
      };
    })
    .filter((row): row is FriendRecord => row !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFriend(userId: string, friendId: string) {
  const friends = await listFriends(userId);
  const friend = friends.find((row) => row.userId === friendId);

  if (!friend) throw notFound("Friend not found");

  return friend;
}

export async function listFriendRequests(
  userId: string,
): Promise<FriendRequestsResponse> {
  const [incoming, outgoing] = await Promise.all([
    db
      .select({
        ...friendUserSelect,
        friendshipId: friendships.id,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(user, eq(user.id, friendships.requesterId))
      .where(
        and(
          eq(friendships.addresseeId, userId),
          eq(friendships.status, "pending"),
        ),
      )
      .orderBy(desc(friendships.createdAt)),
    db
      .select({
        ...friendUserSelect,
        friendshipId: friendships.id,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(user, eq(user.id, friendships.addresseeId))
      .where(
        and(
          eq(friendships.requesterId, userId),
          eq(friendships.status, "pending"),
        ),
      )
      .orderBy(desc(friendships.createdAt)),
  ]);

  return { incoming, outgoing };
}

export async function listFriendMedia(viewerId: string, friendId: string) {
  const friend = await getFriend(viewerId, friendId);

  const data = await db
    .select(friendMediaSummarySelect(viewerId))
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .innerJoin(user, eq(user.id, userMedia.userId))
    .where(
      and(
        eq(userMedia.userId, friendId),
        inArray(userMedia.visibility, [...SHARED_VISIBILITIES]),
        isNull(userMedia.deletedAt),
      ),
    )
    .orderBy(desc(userMedia.updatedAt));

  return { friend, data };
}

/**
 * Counts, per collection, the items a non-owner may actually see. A collection
 * can be shared while some of its entries stay private, so this is the honest
 * number rather than the raw item count.
 *
 * Done as a grouped query merged in JS rather than a correlated subquery: the
 * join puts two `id` columns in scope, which drizzle's `sql` interpolation
 * renders unqualified and Postgres then rejects as ambiguous.
 */
async function countVisibleCollectionItems(collectionIds: string[]) {
  if (!collectionIds.length) return new Map<string, number>();

  const rows = await db
    .select({
      collectionId: mediaCollectionItems.collectionId,
      total: count(),
    })
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(userMedia.id, mediaCollectionItems.userMediaId))
    .where(
      and(
        inArray(mediaCollectionItems.collectionId, collectionIds),
        isNull(userMedia.deletedAt),
        inArray(userMedia.visibility, [...SHARED_VISIBILITIES]),
      ),
    )
    .groupBy(mediaCollectionItems.collectionId);

  return new Map(rows.map((row) => [row.collectionId, row.total]));
}

export async function listFriendCollections(
  viewerId: string,
  friendId: string,
) {
  await getFriend(viewerId, friendId);

  const collections = await db
    .select({
      id: mediaCollection.id,
      name: mediaCollection.name,
      description: mediaCollection.description,
      createdAt: mediaCollection.createdAt,
    })
    .from(mediaCollection)
    .where(
      and(
        eq(mediaCollection.userId, friendId),
        inArray(mediaCollection.visibility, [...SHARED_VISIBILITIES]),
      ),
    )
    .orderBy(mediaCollection.name);

  const counts = await countVisibleCollectionItems(
    collections.map((collection) => collection.id),
  );

  return collections.map((collection) => ({
    ...collection,
    itemCount: counts.get(collection.id) ?? 0,
  }));
}

/**
 * A shared collection and the items inside it that the viewer may see.
 *
 * The collection's own visibility gates access to the collection; each entry's
 * visibility independently gates the entry. A private entry filed in a shared
 * collection stays hidden.
 */
export async function getFriendCollection(
  viewerId: string,
  collectionId: string,
) {
  const [collection] = await db
    .select({
      id: mediaCollection.id,
      name: mediaCollection.name,
      description: mediaCollection.description,
      ownerId: mediaCollection.userId,
      ownerName: user.name,
      visibility: mediaCollection.visibility,
    })
    .from(mediaCollection)
    .innerJoin(user, eq(user.id, mediaCollection.userId))
    .where(eq(mediaCollection.id, collectionId))
    .limit(1);

  if (!collection) throw notFound("Collection not found");

  const isFriend =
    collection.ownerId !== viewerId && collection.visibility === "friends"
      ? await areFriends(viewerId, collection.ownerId)
      : false;

  if (!canView(viewerId, collection, isFriend)) {
    throw notFound("Collection not found");
  }

  const isOwner = collection.ownerId === viewerId;

  const data = await db
    .select(friendMediaSummarySelect(viewerId))
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(userMedia.id, mediaCollectionItems.userMediaId))
    .innerJoin(media, eq(media.id, userMedia.mediaId))
    .innerJoin(user, eq(user.id, userMedia.userId))
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collectionId),
        isNull(userMedia.deletedAt),
        // The owner sees everything of their own; anyone else only the
        // entries that are themselves shared.
        ...(isOwner
          ? []
          : [inArray(userMedia.visibility, [...SHARED_VISIBILITIES])]),
      ),
    )
    .orderBy(mediaCollectionItems.position);

  const { visibility: _visibility, ...publicCollection } = collection;

  return { collection: publicCollection, data };
}

export async function getFriendsFeed(viewerId: string, limit = 20) {
  const friendIds = await listFriendIds(viewerId);

  if (!friendIds.length) return [];

  return db
    .select(friendMediaSummarySelect(viewerId))
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .innerJoin(user, eq(user.id, userMedia.userId))
    .where(
      and(
        inArray(userMedia.userId, friendIds),
        inArray(userMedia.visibility, [...SHARED_VISIBILITIES]),
        isNull(userMedia.deletedAt),
      ),
    )
    .orderBy(desc(userMedia.updatedAt))
    .limit(limit);
}

export async function getViewableUserMediaDetail(
  viewerId: string,
  userMediaId: string,
) {
  await requireViewableUserMedia(viewerId, userMediaId);

  const [record] = await db
    .select(friendMediaDetailedSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .innerJoin(user, eq(user.id, userMedia.userId))
    .where(eq(userMedia.id, userMediaId))
    .limit(1);

  if (!record) throw notFound("Entry not found");

  const reactions = await listReactions(userMediaId);

  return { ...record, reactions };
}

export function listReactions(userMediaId: string) {
  return db
    .select(reactionRecordSelect)
    .from(userMediaReactions)
    .innerJoin(user, eq(user.id, userMediaReactions.userId))
    .where(eq(userMediaReactions.userMediaId, userMediaId))
    .orderBy(user.name);
}

export async function listComments(viewerId: string, userMediaId: string) {
  await requireViewableUserMedia(viewerId, userMediaId);

  return db
    .select(commentRecordSelect)
    .from(userMediaComments)
    .innerJoin(user, eq(user.id, userMediaComments.userId))
    .where(eq(userMediaComments.userMediaId, userMediaId))
    .orderBy(userMediaComments.createdAt);
}

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(sql`lower(${user.email}) = ${email}`)
    .limit(1);

  return row ?? null;
}
