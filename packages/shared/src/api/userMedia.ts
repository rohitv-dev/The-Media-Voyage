import z from "zod";
import type { MediaType, Status } from "../schemas/userMediaSchema";
import {
  userMediaInsertSchema,
  userMediaSelectSchema,
} from "../schemas/userMediaSchema";
import { mediaInsertSchema, mediaSelectSchema } from "../schemas/mediaSchema";
import { mediaTypeEnum, statusEnum, visibilityEnum } from "../";

export const userMediaIdParamsSchema = z.object({
  id: userMediaSelectSchema.shape.id,
});

export type UserMediaIdParams = z.infer<typeof userMediaIdParamsSchema>;

export const mediaRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,

  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  imageUrl: mediaSelectSchema.shape.imageUrl,
  imageFocusX: userMediaSelectSchema.shape.imageFocusX,
  imageFocusY: userMediaSelectSchema.shape.imageFocusY,

  status: userMediaSelectSchema.shape.status,
  progress: userMediaSelectSchema.shape.progress,
  rating: userMediaSelectSchema.shape.rating,
  favorite: userMediaSelectSchema.shape.favorite,
  visibility: userMediaSelectSchema.shape.visibility,
  source: z.string().nullable(),
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
  tags: z.array(z.string()),
});

export type MediaPickerRecord = z.infer<typeof mediaPickerRecordSchema>;

export const userMediaQuickActionSchema = z
  .object({
    favorite: z.boolean().optional(),
    status: userMediaSelectSchema.shape.status.optional(),
    progress: z.number().int().min(0).max(100).optional(),
    visibility: z.enum(visibilityEnum.enumValues).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one quick action is required",
  });

export type UserMediaQuickAction = z.infer<typeof userMediaQuickActionSchema>;

export const seasonProgressEntrySchema = z.object({
  season: z.number().int().min(1),
  status: z.enum(statusEnum.enumValues),
  expectedEpisodeCount: z.number().int().min(0).nullable().optional(),
  episodesWatched: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
  updatedAt: z.iso.datetime(),
});

export type SeasonProgressEntry = z.infer<typeof seasonProgressEntrySchema>;

export const seasonsProgressSchema = z.array(seasonProgressEntrySchema);

export const mediaDetailedRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,
  mediaId: userMediaSelectSchema.shape.mediaId,

  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  description: mediaSelectSchema.shape.description,
  imageUrl: mediaSelectSchema.shape.imageUrl,
  imageFocusX: userMediaSelectSchema.shape.imageFocusX,
  imageFocusY: userMediaSelectSchema.shape.imageFocusY,
  catalogSource: mediaSelectSchema.shape.source,
  catalogExternalId: mediaSelectSchema.shape.externalId,
  catalogMetadata: mediaSelectSchema.shape.metadata,

  status: userMediaSelectSchema.shape.status,
  rating: userMediaSelectSchema.shape.rating,
  review: userMediaSelectSchema.shape.review,
  notes: userMediaSelectSchema.shape.notes,
  progress: userMediaSelectSchema.shape.progress,
  favorite: userMediaSelectSchema.shape.favorite,
  timeSpent: userMediaSelectSchema.shape.timeSpent,
  pagesRead: userMediaSelectSchema.shape.pagesRead,
  source: z.string().nullable(),
  tags: z.array(z.string()),
  visibility: userMediaSelectSchema.shape.visibility,
  seasonsProgress: seasonsProgressSchema,

  startedAt: userMediaSelectSchema.shape.startedAt,
  completedAt: userMediaSelectSchema.shape.completedAt,
  lastProgressUpdate: userMediaSelectSchema.shape.lastProgressUpdate,
  createdAt: userMediaSelectSchema.shape.createdAt,
  updatedAt: userMediaSelectSchema.shape.updatedAt,
});

export type MediaDetailedRecord = z.infer<typeof mediaDetailedRecordSchema>;

export const statusHistoryRecordSchema = z.object({
  id: z.uuid(),
  fromStatus: z.enum(statusEnum.enumValues).nullable(),
  toStatus: z.enum(statusEnum.enumValues),
  progressSnapshot: z.number().int().nullable(),
  source: z.string(),
  changedAt: z.coerce.date(),
});

export type StatusHistoryRecord = z.infer<typeof statusHistoryRecordSchema>;

export const getStatusHistoryResponseSchema = z.array(
  statusHistoryRecordSchema,
);

export type GetStatusHistoryResponse = z.infer<
  typeof getStatusHistoryResponseSchema
>;

export const mediaImageFocusSchema = z
  .object({
    imageFocusX: z.number().min(0).max(1).nullable(),
    imageFocusY: z.number().min(0).max(1).nullable(),
  })
  .refine(
    ({ imageFocusX, imageFocusY }) =>
      (imageFocusX === null) === (imageFocusY === null),
    { message: "Both image focus coordinates must be set or cleared together" },
  );

export type MediaImageFocus = z.infer<typeof mediaImageFocusSchema>;

export const getUserMediaResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  data: z.array(mediaRecordSchema),
});

export type GetUserMediaResponse = z.infer<typeof getUserMediaResponseSchema>;

export const trashedUserMediaRecordSchema = mediaRecordSchema.extend({
  deletedAt: userMediaSelectSchema.shape.deletedAt,
});

export type TrashedUserMediaRecord = z.infer<
  typeof trashedUserMediaRecordSchema
>;

export const getTrashedUserMediaResponseSchema = z.object({
  success: z.boolean(),
  count: z.number(),
  data: z.array(trashedUserMediaRecordSchema),
});

export type GetTrashedUserMediaResponse = z.infer<
  typeof getTrashedUserMediaResponseSchema
>;

const userMediaTrackingFieldsSchema = z.object({
  status: userMediaInsertSchema.shape.status,
  rating: userMediaInsertSchema.shape.rating,
  favorite: userMediaInsertSchema.shape.favorite,
  review: userMediaInsertSchema.shape.review,
  notes: userMediaInsertSchema.shape.notes,
  progress: userMediaInsertSchema.shape.progress,
  timeSpent: userMediaInsertSchema.shape.timeSpent,
  pagesRead: z.number().int().min(0).nullable().optional(),
  visibility: userMediaInsertSchema.shape.visibility,
  seasonsProgress: seasonsProgressSchema.optional(),
  startedAt: userMediaInsertSchema.shape.startedAt,
  completedAt: userMediaInsertSchema.shape.completedAt,
  source: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export const userMediaFormSchema = userMediaTrackingFieldsSchema.extend(
  mediaInsertSchema
    .pick({
      title: true,
      type: true,
      imageUrl: true,
      externalId: true,
      description: true,
      metadata: true,
    })
    .extend({
      mediaId: z.string().optional(),
      mediaSource: z.string().optional(),
    }).shape,
);

export type UserMediaFormSchema = z.infer<typeof userMediaFormSchema>;

export const userMediaPatchSchema = userMediaTrackingFieldsSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one user-media field is required",
  });

export type UserMediaPatchSchema = z.infer<typeof userMediaPatchSchema>;

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

export const userMediaSearchQuerySchema = z.object({
  search: z.string().trim().min(2),
});

export type UserMediaSearchQuery = z.infer<typeof userMediaSearchQuerySchema>;

export const userMediaSearchRecordSchema = z.object({
  id: userMediaSelectSchema.shape.id,
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
});

export type UserMediaSearchRecord = z.infer<typeof userMediaSearchRecordSchema>;

export const getUserMediaSearchResponseSchema = z.array(
  userMediaSearchRecordSchema,
);

export type GetUserMediaSearchResponse = z.infer<
  typeof getUserMediaSearchResponseSchema
>;

export const semanticSearchQuerySchema = z.object({
  q: z.string().trim().min(5).max(500),
});

export type SemanticSearchQuery = z.infer<typeof semanticSearchQuerySchema>;

export const getSemanticSearchResponseSchema = z.array(mediaRecordSchema);

export type GetSemanticSearchResponse = z.infer<
  typeof getSemanticSearchResponseSchema
>;

export const userMediaPageQuerySchema = userMediaQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

export type UserMediaPageQuerySchema = z.infer<typeof userMediaPageQuerySchema>;

export const getUserMediaPageResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(mediaRecordSchema),
  nextPage: z.number().int().min(1).nullable(),
});

export type GetUserMediaPageResponse = z.infer<
  typeof getUserMediaPageResponseSchema
>;

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

  timeSpent: {
    totalMinutes: number;
    byType: {
      type: MediaType;
      minutes: number;
    }[];
  };
};

export const calendarActivityQuerySchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
});

export type CalendarActivityQuery = z.infer<typeof calendarActivityQuerySchema>;

export type CalendarEventType = "started" | "completed" | "status_change";

export type CalendarActivityEvent = {
  date: string; // YYYY-MM-DD bucket the event falls on
  eventType: CalendarEventType;
  occurredAt: string; // ISO timestamp
  userMediaId: string;
  mediaId: string;
  title: string;
  type: MediaType;
  status: Status;
  fromStatus: Status | null;
  toStatus: Status | null;
};

export type CalendarActivityResponse = {
  from: string;
  to: string;
  events: CalendarActivityEvent[];
};
