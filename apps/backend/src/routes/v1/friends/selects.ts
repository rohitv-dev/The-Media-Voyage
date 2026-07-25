import {
  user,
  userMedia,
  userMediaComments,
  userMediaReactions,
} from "@media-voyage/shared";
import { sql } from "drizzle-orm";
import {
  userMediaDetailedSelect,
  userMediaSummarySelect,
} from "../user-media/selects";

/**
 * `notes` is the owner-only personal scratchpad and `visibility` would tell a
 * viewer whether an entry is `friends` or `public` — neither is ever selected
 * for anyone but the owner, so they are stripped here rather than nulled out
 * further down the stack.
 */
const {
  notes: _ownerOnlyNotes,
  visibility: _ownerOnlyVisibility,
  ...sharedDetailedSelect
} = userMediaDetailedSelect;

const likeCount = sql<number>`(
  select count(*)::int
  from ${userMediaReactions}
  where ${userMediaReactions.userMediaId} = ${userMedia.id}
    and ${userMediaReactions.value} > 0
)`;

const dislikeCount = sql<number>`(
  select count(*)::int
  from ${userMediaReactions}
  where ${userMediaReactions.userMediaId} = ${userMedia.id}
    and ${userMediaReactions.value} < 0
)`;

const commentCount = sql<number>`(
  select count(*)::int
  from ${userMediaComments}
  where ${userMediaComments.userMediaId} = ${userMedia.id}
)`;

const myReaction = (viewerId: string) => sql<number | null>`(
  select ${userMediaReactions.value}
  from ${userMediaReactions}
  where ${userMediaReactions.userMediaId} = ${userMedia.id}
    and ${userMediaReactions.userId} = ${viewerId}
)`;

const ownerSelect = {
  ownerId: userMedia.userId,
  ownerName: user.name,
};

export const friendMediaSummarySelect = (viewerId: string) => ({
  ...userMediaSummarySelect,
  ...ownerSelect,
  likeCount,
  dislikeCount,
  commentCount,
  myReaction: myReaction(viewerId),
});

export const friendMediaDetailedSelect = {
  ...sharedDetailedSelect,
  ...ownerSelect,
  commentCount,
};

export const friendUserSelect = {
  userId: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
};

export const reactionRecordSelect = {
  userId: userMediaReactions.userId,
  name: user.name,
  value: userMediaReactions.value,
};

export const commentRecordSelect = {
  id: userMediaComments.id,
  userId: userMediaComments.userId,
  name: user.name,
  body: userMediaComments.body,
  createdAt: userMediaComments.createdAt,
};
