import z from "zod";
import {
  mediaTypeEnum,
  recommendationOriginEnum,
  recommendationOutcomeEnum,
  recommendationStatusEnum,
  statusEnum,
} from "../db/schema";

const recommendationUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

const recommendationMediaSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  type: z.enum(mediaTypeEnum.enumValues),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

const recommendationDetailBaseSchema = z.object({
  id: z.uuid(),
  origin: z.enum(recommendationOriginEnum.enumValues),
  viewerRole: z.enum(["sender", "recipient"]),
  recipient: recommendationUserSchema,
  sender: recommendationUserSchema.nullable(),
  media: recommendationMediaSchema,
  status: z.enum(recommendationStatusEnum.enumValues),
  outcome: z.enum(recommendationOutcomeEnum.enumValues).nullable(),
  senderNote: z.string().nullable(),
  recipientNote: z.string().nullable(),
  recipientUserMediaId: z.uuid().nullable(),
  existingRecipientUserMediaId: z.uuid().nullable(),
  existingRecipientUserMediaStatus: z.enum(statusEnum.enumValues).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
});

export const friendRecommendationDetailSchema =
  recommendationDetailBaseSchema.extend({
    origin: z.literal("friend"),
    sender: recommendationUserSchema,
  });

export const systemRecommendationDetailSchema =
  recommendationDetailBaseSchema.extend({
    origin: z.literal("system"),
    sender: z.null(),
    systemStrategyKey: z.string(),
    systemStrategyVersion: z.string().nullable(),
    systemReason: z.string(),
    systemRank: z.number().int().nullable(),
  });

export const recommendationDetailSchema = z.discriminatedUnion("origin", [
  friendRecommendationDetailSchema,
  systemRecommendationDetailSchema,
]);

export type RecommendationDetail = z.infer<typeof recommendationDetailSchema>;

export const createFriendRecommendationSchema = z.object({
  recipientId: z.string().min(1),
  sourceUserMediaId: z.uuid(),
  senderNote: z.string().trim().max(2000).optional(),
});

export type CreateFriendRecommendationInput = z.infer<
  typeof createFriendRecommendationSchema
>;

export const recommendationIdParamsSchema = z.object({
  id: z.uuid(),
});

export type RecommendationIdParams = z.infer<
  typeof recommendationIdParamsSchema
>;

export const resolveRecommendationSchema = z
  .object({
    outcome: z.enum(recommendationOutcomeEnum.enumValues),
    recipientNote: z.string().trim().max(2000).optional(),
    addToLibrary: z.boolean().default(false),
  })
  .refine(
    ({ outcome, addToLibrary }) =>
      !addToLibrary || outcome === "already_completed",
    {
      message:
        "addToLibrary is only valid when the recommendation is already completed",
      path: ["addToLibrary"],
    },
  );

export type ResolveRecommendationInput = z.infer<
  typeof resolveRecommendationSchema
>;

export const createRecommendationResponseSchema = z.object({
  id: z.uuid(),
  status: z.literal("pending"),
});

export type CreateRecommendationResponse = z.infer<
  typeof createRecommendationResponseSchema
>;

export const recommendationResolutionResponseSchema = z.object({
  id: z.uuid(),
  status: z.literal("resolved"),
  outcome: z.enum(recommendationOutcomeEnum.enumValues),
  recipientUserMediaId: z.uuid().nullable(),
  recipientUserMediaCreated: z.boolean(),
});

export type RecommendationResolutionResponse = z.infer<
  typeof recommendationResolutionResponseSchema
>;
