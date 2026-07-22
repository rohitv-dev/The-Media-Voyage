import z from "zod";
import type { MediaType, Status } from "../schemas/userMediaSchema";
import {
  userMediaInsertSchema,
  userMediaSelectSchema,
} from "../schemas/userMediaSchema";
import { mediaInsertSchema, mediaSelectSchema } from "../schemas/mediaSchema";
import { mediaTypeEnum, statusEnum } from "../";

export const userMediaIdParamsSchema = z.object({
  id: userMediaSelectSchema.shape.id,
});

export type UserMediaIdParams = z.infer<typeof userMediaIdParamsSchema>;

export const mediaRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,

  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,

  status: userMediaSelectSchema.shape.status,
  progress: userMediaSelectSchema.shape.progress,
  rating: userMediaSelectSchema.shape.rating,
  favorite: userMediaSelectSchema.shape.favorite,
  source: userMediaSelectSchema.shape.source,
  lastProgressUpdate: userMediaSelectSchema.shape.lastProgressUpdate,

  createdAt: userMediaSelectSchema.shape.createdAt,
  updatedAt: userMediaSelectSchema.shape.updatedAt,
});

export type MediaRecord = z.infer<typeof mediaRecordSchema>;

export const mediaPickerQuerySchema = z.object({
  type: z.enum(mediaTypeEnum.enumValues).optional(),
  source: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
  collectionId: z.uuid().optional(),
});

export type MediaPickerQuery = z.infer<typeof mediaPickerQuerySchema>;

export const mediaPickerRecordSchema = mediaRecordSchema.extend({
  imageUrl: mediaSelectSchema.shape.imageUrl,
  tags: userMediaSelectSchema.shape.tags,
});

export type MediaPickerRecord = z.infer<typeof mediaPickerRecordSchema>;

export const userMediaQuickActionSchema = z
  .object({
    favorite: z.boolean().optional(),
    status: userMediaSelectSchema.shape.status.optional(),
    progress: z.number().int().min(0).max(100).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one quick action is required",
  });

export type UserMediaQuickAction = z.infer<typeof userMediaQuickActionSchema>;

export const mediaDetailedRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,
  mediaId: userMediaSelectSchema.shape.mediaId,

  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  description: mediaSelectSchema.shape.description,
  imageUrl: mediaSelectSchema.shape.imageUrl,

  status: userMediaSelectSchema.shape.status,
  rating: userMediaSelectSchema.shape.rating,
  review: userMediaSelectSchema.shape.review,
  notes: userMediaSelectSchema.shape.notes,
  progress: userMediaSelectSchema.shape.progress,
  favorite: userMediaSelectSchema.shape.favorite,
  rewatches: userMediaSelectSchema.shape.rewatches,
  timeSpent: userMediaSelectSchema.shape.timeSpent,
  source: userMediaSelectSchema.shape.source,
  tags: userMediaSelectSchema.shape.tags,
  visibility: userMediaSelectSchema.shape.visibility,
  customFields: userMediaSelectSchema.shape.customFields,
  seasonsProgress: userMediaSelectSchema.shape.seasonsProgress,

  startedAt: userMediaSelectSchema.shape.startedAt,
  completedAt: userMediaSelectSchema.shape.completedAt,
  lastProgressUpdate: userMediaSelectSchema.shape.lastProgressUpdate,
  createdAt: userMediaSelectSchema.shape.createdAt,
  updatedAt: userMediaSelectSchema.shape.updatedAt,
});

export type MediaDetailedRecord = z.infer<typeof mediaDetailedRecordSchema>;

export const getUserDetailedMediaResponseSchema = z.object({
  success: z.boolean(),
  data: mediaDetailedRecordSchema,
});

export type GetUserDetailedMediaResponse = z.infer<
  typeof getUserDetailedMediaResponseSchema
>;

export const getUserMediaResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  data: z.array(mediaRecordSchema),
});

export type GetUserMediaResponse = z.infer<typeof getUserMediaResponseSchema>;

export const userMediaFieldsSchema = userMediaInsertSchema.omit({
  id: true,
  userId: true,
  mediaId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  lastProgressUpdate: true,
  statusChangedAt: true,
});

export const userMediaFormSchema = userMediaInsertSchema
  .pick({
    status: true,
    rating: true,
    favorite: true,
    review: true,
    notes: true,
    progress: true,
    rewatches: true,
    source: true,
    tags: true,
    timeSpent: true,
    visibility: true,
    customFields: true,
    seasonsProgress: true,
    startedAt: true,
    completedAt: true,
  })
  .extend(
    mediaInsertSchema.pick({
      title: true,
      type: true,
      imageUrl: true,
      releaseDate: true,
      externalId: true,
    }).shape,
  )
  .extend(
    z.object({
      mediaId: z.string().optional(),
      mediaSource: z.string().optional(),
    }).shape,
  );

export type UserMediaFormSchema = z.infer<typeof userMediaFormSchema>;

const arrayFromJson = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string") {
      return JSON.parse(value);
    }
    return value;
  }, z.array(schema));

export const userMediaQuerySchema = z.object({
  status: arrayFromJson(z.enum(statusEnum.enumValues)).optional(),
  type: arrayFromJson(z.enum(mediaTypeEnum.enumValues)).optional(),
  favorite: z.coerce.boolean().optional(),
  search: z.string().optional(),
  minRating: z.coerce.number().min(0).max(10).optional(),
  maxRating: z.coerce.number().min(0).max(10).optional(),
  createdFrom: z.iso.date().optional(),
  createdTo: z.iso.date().optional(),
  sources: arrayFromJson(z.string().trim().min(1)).optional(),
  tags: arrayFromJson(z.string().trim().min(1)).optional(),
  sort: z
    .enum(["createdAt", "updatedAt", "rating", "title"])
    .default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type UserMediaQuerySchema = z.infer<typeof userMediaQuerySchema>;

export type UserMediaCounts = {
  status: Status;
  count: number;
}[];

export type UserMediaDropdowns = {
  sources: string[];
  tags: string[];
};

export type DashboardStatsResponse = {
  summary: {
    total_media: number;
    completed: number;
    planned: number;
    in_progress: number;
    on_hold: number;
    dropped: number;
    revisiting: number;
    collections: number;
  };

  statusDistribution: {
    status: Status;
    count: number;
  }[];

  mediaTypeDistribution: {
    type: MediaType;
    count: number;
  }[];

  ratingDistribution: {
    rating: number;
    count: number;
  }[];

  completionTrend: {
    month: string; // YYYY-MM
    count: number;
  }[];
};
