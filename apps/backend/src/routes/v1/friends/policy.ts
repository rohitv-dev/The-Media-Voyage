/**
 * Pure decision logic for the friends feature.
 *
 * These functions hold the rules — who may see an entry, and what a new friend
 * request should do about any existing relationship — with no database access.
 * The queries/service layers fetch the rows and then ask these functions what
 * to do, which keeps the rules readable in one place and testable without a
 * live Postgres. See policy.test.ts.
 */

export type Visibility = "private" | "friends" | "public" | null;

/**
 * Anything owned by a user and shared by a visibility setting. Both user_media
 * entries and collections have this shape, and both obey the same rule.
 */
export type ShareableResource = {
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
 * Whether `viewerId` may see a shared resource (an entry or a collection).
 *
 * `isFriend` must already account for an *accepted* friendship in either
 * direction. A null visibility is treated as private, matching the column's
 * default, so nothing ever becomes visible by omission.
 */
export function canView(
  viewerId: string,
  resource: ShareableResource,
  isFriend: boolean,
): boolean {
  if (resource.ownerId === viewerId) return true;
  if (resource.visibility === "public") return true;
  if (resource.visibility === "friends") return isFriend;

  return false;
}

/**
 * Visibility ordered from most to least restrictive. Used to compare a
 * collection against the entries inside it — never to grant access, which is
 * always `canView`'s job.
 */
const VISIBILITY_RANK: Record<Exclude<Visibility, null>, number> = {
  private: 0,
  friends: 1,
  public: 2,
};

export function visibilityRank(visibility: Visibility): number {
  // Null behaves as private here for the same reason it does in canView.
  return visibility === null ? 0 : VISIBILITY_RANK[visibility];
}

/**
 * True when `entry` is more restrictive than `target`, i.e. sharing a
 * collection at `target` would not be enough to make that entry visible.
 *
 * A collection's visibility deliberately does NOT override an entry's own.
 * An entry marked private stays invisible wherever it is filed; the only way
 * to widen it is to change the entry, which is what the bump flow does with
 * the owner's explicit consent.
 */
export function isStricterThan(entry: Visibility, target: Visibility): boolean {
  return visibilityRank(entry) < visibilityRank(target);
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
