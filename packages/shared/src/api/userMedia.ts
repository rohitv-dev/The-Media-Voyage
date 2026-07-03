import z from "zod";
import { Status, userMediaInsertSchema, userMediaSelectSchema } from "../schemas/userMediaSchema";
import { mediaInsertSchema, mediaSelectSchema } from "../schemas/mediaSchema";
import { mediaTypeEnum, statusEnum } from "../";

export const mediaRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,

  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,

  status: userMediaSelectSchema.shape.status,
  rating: userMediaSelectSchema.shape.rating,
  favorite: userMediaSelectSchema.shape.favorite,
  source: userMediaSelectSchema.shape.source,

  createdAt: userMediaSelectSchema.shape.createdAt,
});

export type MediaRecord = z.infer<typeof mediaRecordSchema>;

export const mediaDetailedRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,
  mediaId: userMediaSelectSchema.shape.mediaId,

  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  description: mediaSelectSchema.shape.description,
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
  createdAt: userMediaSelectSchema.shape.createdAt,
  updatedAt: userMediaSelectSchema.shape.updatedAt,
});

export type MediaDetailedRecord = z.infer<typeof mediaDetailedRecordSchema>;

export const getUserDetailedMediaResponseSchema = z.object({
  success: z.boolean(),
  data: mediaDetailedRecordSchema,
});

export type GetUserDetailedMediaResponse = z.infer<typeof getUserDetailedMediaResponseSchema>;

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
  lastProgressUpdate: true,
  isDeleted: true,
});

export const addUserMediaRequestSchema = z
  .object({
    mediaId: z.string().optional(),

    media: mediaInsertSchema
      .pick({
        title: true,
        type: true,
        description: true,
      })
      .optional(),

    userMedia: userMediaFieldsSchema,
  })
  .refine((data) => data.mediaId || data.media, {
    message: "Either mediaId or media must be provided",
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
    lastProgressUpdate: true,
    startedAt: true,
    completedAt: true,
  })
  .extend(
    mediaInsertSchema.pick({
      title: true,
      type: true,
    }).shape,
  )
  .extend(
    z.object({
      mediaId: z.string().optional(),
    }).shape,
  );

export type AddUserMediaRequest = z.infer<typeof addUserMediaRequestSchema>;
export type UserMediaFormSchema = z.infer<typeof userMediaFormSchema>;

export const userMediaQuerySchema = z.object({
  status: z.enum(statusEnum.enumValues).optional(),
  type: z.enum(mediaTypeEnum.enumValues).optional(),

  favorite: z.coerce.boolean().optional(),

  search: z.string().optional(),

  // sort: z.enum(["createdAt", "updatedAt", "rating", "title"]).default("updatedAt"),

  // order: z.enum(["asc", "desc"]).default("desc"),
});

export type UserMediaQuerySchema = z.infer<typeof userMediaQuerySchema>;

export type UserMediaCounts = {
  status: Status;
  count: number;
}[];
