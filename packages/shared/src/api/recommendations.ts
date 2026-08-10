import z from "zod";
import {
  mediaTypeEnum,
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

export const recommendationDetailSchema = z.object({
  id: z.uuid(),
  viewerRole: z.enum(["sender", "recipient"]),
  recipient: recommendationUserSchema,
  sender: recommendationUserSchema,
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
});

export type RecommendationDetail = z.infer<typeof recommendationDetailSchema>;

export const systemRecommendationProviderSchema = z.enum([
  "tmdb_movie",
  "tmdb_tv",
  "igdb",
  "open_library",
]);

export const dismissSystemRecommendationSchema = z.object({
  source: systemRecommendationProviderSchema,
  externalId: z.string().trim().min(1),
});

export type DismissSystemRecommendationInput = z.infer<
  typeof dismissSystemRecommendationSchema
>;

export const dismissSystemRecommendationResponseSchema = z.object({
  success: z.literal(true),
});

export type DismissSystemRecommendationResponse = z.infer<
  typeof dismissSystemRecommendationResponseSchema
>;

const systemRecommendationPreviewMediaSchema = z.object({
  source: systemRecommendationProviderSchema,
  externalId: z.string().min(1),
  title: z.string(),
  type: z.enum(mediaTypeEnum.enumValues),
  imageUrl: z.string().nullable(),
  creators: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
  numberOfPages: z.number().optional(),
});

const systemRecommendationPreviewSeedSchema = z.object({
  userMediaId: z.uuid(),
  title: z.string(),
  type: z.enum(mediaTypeEnum.enumValues),
  status: z.enum(["in_progress", "completed", "revisiting"]),
  rating: z.number().int().min(0).max(10).nullable(),
  favorite: z.boolean(),
  catalogSource: z.string().nullable(),
  catalogExternalId: z.string().nullable(),
  mappingStatus: z.enum(["mapped", "unmapped", "provider_error"]),
  mappingReason: z.enum([
    "provider_id",
    "unsupported_source",
    "invalid_external_id",
    "provider_error",
  ]),
  recommendationSource: systemRecommendationProviderSchema.nullable(),
  recommendationExternalId: z.string().nullable(),
  candidateCount: z.number().int().nonnegative(),
});

export const systemRecommendationPreviewResponseSchema = z.object({
  strategyKey: z.literal("provider_recommendations"),
  strategyVersion: z.literal("4"),
  eligibleSeedCount: z.number().int().nonnegative(),
  seeds: z.array(systemRecommendationPreviewSeedSchema),
  recommendations: z.array(
    z.object({
      rank: z.number().int().positive(),
      reason: z.string(),
      seedUserMediaId: z.uuid(),
      seedUserMediaIds: z.array(z.uuid()).min(1),
      media: systemRecommendationPreviewMediaSchema,
    }),
  ),
});

export type SystemRecommendationPreviewResponse = z.infer<
  typeof systemRecommendationPreviewResponseSchema
>;

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
