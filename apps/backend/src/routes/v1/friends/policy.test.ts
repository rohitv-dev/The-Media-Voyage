/**
 * Tests for the friends access rules.
 *
 * Vitest picks up any `*.test.ts` file. Run them with `pnpm test` from
 * apps/backend, or `pnpm test:watch` to re-run on save.
 *
 * The vocabulary:
 *   describe(...)  groups related tests, purely for readable output
 *   it(...)        one test — the name should read as a sentence
 *   expect(x).toBe(y)     strict equality (===), good for booleans/strings
 *   expect(x).toEqual(y)  deep equality, for comparing objects/arrays
 *
 * Nothing here touches Postgres. That's the point of keeping these rules in
 * policy.ts as pure functions: the tests construct plain objects and assert on
 * the answer, so they run in milliseconds and can cover cases that would be
 * fiddly to set up as real database rows.
 */
import { describe, expect, it } from "vitest";
import { canView, isStricterThan, resolveFriendRequest, visibleEntryVisibilities, visibilityRank, type FriendshipRow } from "./policy";

const OWNER = "user-owner";
const FRIEND = "user-friend";
const STRANGER = "user-stranger";

describe("canView", () => {
  it("lets the owner see their own entry regardless of visibility", () => {
    // Private is the interesting case: everyone else is denied below.
    expect(canView(OWNER, { ownerId: OWNER, visibility: "private" }, false)).toBe(true);
  });

  it("denies a stranger a private entry", () => {
    expect(canView(STRANGER, { ownerId: OWNER, visibility: "private" }, false)).toBe(false);
  });

  it("lets anyone see a public entry, friend or not", () => {
    const entry = { ownerId: OWNER, visibility: "public" as const };

    expect(canView(FRIEND, entry, true)).toBe(true);
    expect(canView(STRANGER, entry, false)).toBe(true);
  });

  it("lets a friend see a friends-visible entry", () => {
    expect(canView(FRIEND, { ownerId: OWNER, visibility: "friends" }, true)).toBe(true);
  });

  it("denies a non-friend a friends-visible entry", () => {
    expect(canView(STRANGER, { ownerId: OWNER, visibility: "friends" }, false)).toBe(false);
  });

  it("denies a friend a private entry", () => {
    // Being friends is not blanket access — the entry must be shared too.
    expect(canView(FRIEND, { ownerId: OWNER, visibility: "private" }, true)).toBe(false);
  });

  /**
   * The same expectations as above, written as a table. When a rule has many
   * combinations this is easier to scan than one `it` per case — each row
   * becomes its own named test, so a failure still points at one line.
   */
  describe("full matrix", () => {
    const cases: Array<{
      viewer: string;
      visibility: "private" | "friends" | "public";
      isFriend: boolean;
      expected: boolean;
    }> = [
      { viewer: OWNER, visibility: "private", isFriend: false, expected: true },
      { viewer: OWNER, visibility: "friends", isFriend: false, expected: true },
      { viewer: OWNER, visibility: "public", isFriend: false, expected: true },
      { viewer: FRIEND, visibility: "private", isFriend: true, expected: false },
      { viewer: FRIEND, visibility: "friends", isFriend: true, expected: true },
      { viewer: FRIEND, visibility: "public", isFriend: true, expected: true },
      { viewer: STRANGER, visibility: "private", isFriend: false, expected: false },
      { viewer: STRANGER, visibility: "friends", isFriend: false, expected: false },
      { viewer: STRANGER, visibility: "public", isFriend: false, expected: true },
    ];

    it.each(cases)(
      "viewer=$viewer visibility=$visibility isFriend=$isFriend -> $expected",
      ({ viewer, visibility, isFriend, expected }) => {
        expect(canView(viewer, { ownerId: OWNER, visibility }, isFriend)).toBe(expected);
      },
    );
  });
});

describe("visibleEntryVisibilities", () => {
  it("keeps private entries for the owner only", () => {
    expect(visibleEntryVisibilities(true, false)).toBeUndefined();
  });

  it("lets a friend see friends and public entries", () => {
    expect(visibleEntryVisibilities(false, true)).toEqual([
      "friends",
      "public",
    ]);
  });

  it("lets a stranger see public entries only", () => {
    expect(visibleEntryVisibilities(false, false)).toEqual(["public"]);
  });
});

describe("visibility strictness", () => {
  it("orders visibility from most to least restrictive", () => {
    expect(visibilityRank("private")).toBeLessThan(visibilityRank("friends"));
    expect(visibilityRank("friends")).toBeLessThan(visibilityRank("public"));
  });

  it("flags an entry stricter than the collection it sits in", () => {
    // Sharing a collection with friends does not reveal a private entry, so
    // that entry is what the bump prompt offers to widen.
    expect(isStricterThan("private", "friends")).toBe(true);
    expect(isStricterThan("private", "public")).toBe(true);
    expect(isStricterThan("friends", "public")).toBe(true);
  });

  it("does not flag entries already at or beyond the collection", () => {
    expect(isStricterThan("friends", "friends")).toBe(false);
    expect(isStricterThan("public", "friends")).toBe(false);
    expect(isStricterThan("public", "public")).toBe(false);
  });

  it("never flags anything when the collection itself is private", () => {
    // A private collection shares nothing, so there is nothing to bump.
    expect(isStricterThan("private", "private")).toBe(false);
    expect(isStricterThan("friends", "private")).toBe(false);
    expect(isStricterThan("public", "private")).toBe(false);
  });
});

describe("resolveFriendRequest", () => {
  // A tiny helper so each test states only what it cares about.
  const friendship = (overrides: Partial<FriendshipRow> = {}): FriendshipRow => ({
    id: "friendship-1",
    requesterId: OWNER,
    addresseeId: FRIEND,
    status: "pending",
    ...overrides,
  });

  it("creates a new request when no relationship exists", () => {
    expect(resolveFriendRequest(OWNER, null)).toEqual({ type: "create" });
  });

  it("reports already friends when one is accepted", () => {
    expect(resolveFriendRequest(OWNER, friendship({ status: "accepted" }))).toEqual({ type: "already_friends" });
  });

  it("reports a duplicate when we already requested them", () => {
    expect(resolveFriendRequest(OWNER, friendship({ requesterId: OWNER }))).toEqual({ type: "already_requested" });
  });

  it("accepts their pending request instead of mirroring it", () => {
    // They asked us first, so requesting them back should just accept — this
    // is what stops two rows existing for one pair.
    const theirs = friendship({ requesterId: FRIEND, addresseeId: OWNER });

    expect(resolveFriendRequest(OWNER, theirs)).toEqual({
      type: "accept_existing",
      friendshipId: "friendship-1",
    });
  });

  it("replaces a declined row so the new requester ends up as requester", () => {
    const declined = friendship({ status: "declined", requesterId: FRIEND, addresseeId: OWNER });

    expect(resolveFriendRequest(OWNER, declined)).toEqual({
      type: "replace_existing",
      friendshipId: "friendship-1",
    });
  });

  it("also replaces a declined row we ourselves sent, allowing a re-request", () => {
    expect(resolveFriendRequest(OWNER, friendship({ status: "declined" }))).toEqual({
      type: "replace_existing",
      friendshipId: "friendship-1",
    });
  });

  it("is unaffected by which side of the row the requester sits on", () => {
    // friendshipBetween can return the row in either direction, so the rule
    // must key off requesterId rather than assuming an ordering.
    const accepted = friendship({ status: "accepted", requesterId: FRIEND, addresseeId: OWNER });

    expect(resolveFriendRequest(OWNER, accepted)).toEqual({ type: "already_friends" });
  });
});
