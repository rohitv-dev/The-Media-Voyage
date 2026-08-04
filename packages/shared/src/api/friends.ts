import z from "zod";
import { mediaDetailedRecordSchema, mediaRecordSchema } from "./userMedia";
import { visibilityEnum } from "../";

export const friendRequestSchema = z.object({
  email: z.email().trim().toLowerCase(),
});

export type FriendRequestInput = z.infer<typeof friendRequestSchema>;

export const friendRespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export type FriendRespondInput = z.infer<typeof friendRespondSchema>;

export const friendshipIdParamsSchema = z.object({
  friendshipId: z.uuid(),
});

export const friendUserIdParamsSchema = z.object({
  userId: z.string().min(1),
});

const friendUserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
});

export const friendRecordSchema = friendUserSchema.extend({
  friendshipId: z.uuid(),
  since: z.coerce.date().nullable(),
  /** How many of their entries this viewer is allowed to see. */
  sharedCount: z.number(),
});

export type FriendRecord = z.infer<typeof friendRecordSchema>;

export const friendRequestRecordSchema = friendUserSchema.extend({
  friendshipId: z.uuid(),
  createdAt: z.coerce.date().nullable(),
});

export type FriendRequestRecord = z.infer<typeof friendRequestRecordSchema>;

export type FriendRequestsResponse = {
  incoming: FriendRequestRecord[];
  outgoing: FriendRequestRecord[];
};

export const shareLibrarySchema = z.object({
  visibility: z.enum(visibilityEnum.enumValues),
  /** Only rewrite entries that are still at the default `private`. */
  onlyPrivate: z.boolean().default(true),
});

export type ShareLibraryInput = z.infer<typeof shareLibrarySchema>;

/* -------------------------------------------------------------------------- */
/* Social                                                                      */
/* -------------------------------------------------------------------------- */

/** +1 like, -1 dislike, null clears the viewer's existing reaction. */
export const reactionInputSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1), z.null()]),
});

export type ReactionInput = z.infer<typeof reactionInputSchema>;

export const reactionRecordSchema = z.object({
  userId: z.string(),
  name: z.string(),
  value: z.number(),
});

export type ReactionRecord = z.infer<typeof reactionRecordSchema>;

export const commentFormSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type CommentFormInput = z.infer<typeof commentFormSchema>;

export const commentIdParamsSchema = z.object({
  commentId: z.uuid(),
});

export const commentRecordSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  name: z.string(),
  body: z.string(),
  createdAt: z.coerce.date().nullable(),
});

export type CommentRecord = z.infer<typeof commentRecordSchema>;

const socialSummarySchema = z.object({
  likeCount: z.number(),
  dislikeCount: z.number(),
  commentCount: z.number(),
  /** This viewer's own reaction: 1, -1, or null. */
  myReaction: z.number().nullable(),
});

const ownerSchema = z.object({
  ownerId: z.string(),
  ownerName: z.string(),
});

export const friendMediaRecordSchema = mediaRecordSchema
  .omit({ visibility: true })
  .extend(socialSummarySchema.shape)
  .extend(ownerSchema.shape);

export type FriendMediaRecord = z.infer<typeof friendMediaRecordSchema>;

/**
 * A friend-facing entry. `notes` is deliberately absent — the personal notes
 * field is owner-only and is never selected for anyone else. `visibility` is
 * dropped too, so viewers can't tell `friends` from `public`.
 */
export const friendMediaDetailedSchema = mediaDetailedRecordSchema
  .omit({ notes: true, visibility: true })
  .extend(ownerSchema.shape)
  .extend({
    reactions: z.array(reactionRecordSchema),
    commentCount: z.number(),
  });

export type FriendMediaDetailed = z.infer<typeof friendMediaDetailedSchema>;

export type FriendMediaListResponse = {
  friend: FriendRecord;
  data: FriendMediaRecord[];
};
