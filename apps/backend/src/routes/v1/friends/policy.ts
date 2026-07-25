/**
 * Pure decision logic for the friends feature.
 *
 * These functions hold the rules — who may see an entry, and what a new friend
 * request should do about any existing relationship — with no database access.
 * The queries/service layers fetch the rows and then ask these functions what
 * to do, which keeps the rules readable in one place and testable without a
 * live Postgres. See policy.test.ts.
 */

type Visibility = "private" | "friends" | "public" | null;

export type ViewableEntry = {
  ownerId: string;
  visibility: Visibility;
};

export type FriendshipRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "declined" | "accepted";
};

/**
 * Whether `viewerId` may see an entry.
 *
 * `isFriend` must already account for an *accepted* friendship in either
 * direction. A null visibility is treated as private, matching the column's
 * default, so an entry never becomes visible by omission.
 */
export function canViewEntry(
  viewerId: string,
  entry: ViewableEntry,
  isFriend: boolean,
): boolean {
  if (entry.ownerId === viewerId) return true;
  if (entry.visibility === "public") return true;
  if (entry.visibility === "friends") return isFriend;

  return false;
}

export type FriendRequestOutcome =
  | { type: "already_friends" }
  | { type: "already_requested" }
  /** They requested us first — accept theirs instead of mirroring it. */
  | { type: "accept_existing"; friendshipId: string }
  /** A declined row is replaced so the new requester ends up on the requester side. */
  | { type: "replace_existing"; friendshipId: string }
  | { type: "create" };

/**
 * Decides what sending a friend request should do, given whatever relationship
 * already exists between the two people (in either direction, or none).
 */
export function resolveFriendRequest(
  requesterId: string,
  existing: FriendshipRow | null,
): FriendRequestOutcome {
  if (!existing) return { type: "create" };

  if (existing.status === "accepted") return { type: "already_friends" };

  if (existing.status === "pending") {
    return existing.requesterId === requesterId
      ? { type: "already_requested" }
      : { type: "accept_existing", friendshipId: existing.id };
  }

  return { type: "replace_existing", friendshipId: existing.id };
}
