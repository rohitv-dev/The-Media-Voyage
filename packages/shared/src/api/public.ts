import z from "zod";
import { mediaSelectSchema } from "../schemas/mediaSchema";
import { mediaCollectionSelectSchema } from "../schemas/mediaCollection";
import { userMediaSelectSchema } from "../schemas/userMediaSchema";
import { seasonProgressEntrySchema } from "./userMedia";

export const publicIdParamsSchema = z.object({
  publicId: z.string().min(1),
});

export type PublicIdParams = z.infer<typeof publicIdParamsSchema>;

export const publicMediaSummarySchema = z.object({
  publicId: z.uuid(),
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  imageUrl: mediaSelectSchema.shape.imageUrl,
  imageFocusX: mediaSelectSchema.shape.imageFocusX,
  imageFocusY: mediaSelectSchema.shape.imageFocusY,
  status: userMediaSelectSchema.shape.status,
  progress: userMediaSelectSchema.shape.progress,
  rating: userMediaSelectSchema.shape.rating,
  favorite: userMediaSelectSchema.shape.favorite,
  source: z.string().nullable(),
  lastProgressUpdate: userMediaSelectSchema.shape.lastProgressUpdate,
  createdAt: userMediaSelectSchema.shape.createdAt,
  updatedAt: userMediaSelectSchema.shape.updatedAt,
});

export type PublicMediaSummary = z.infer<typeof publicMediaSummarySchema>;

export const publicSeasonProgressEntrySchema = seasonProgressEntrySchema.omit({
  notes: true,
});

export type PublicSeasonProgressEntry = z.infer<
  typeof publicSeasonProgressEntrySchema
>;

export const publicSeasonsProgressSchema = z.array(
  publicSeasonProgressEntrySchema,
);

export const publicMediaDetailSchema = z.object({
  publicId: z.uuid(),
  ownerName: z.string(),
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  description: mediaSelectSchema.shape.description,
  imageUrl: mediaSelectSchema.shape.imageUrl,
  imageFocusX: mediaSelectSchema.shape.imageFocusX,
  imageFocusY: mediaSelectSchema.shape.imageFocusY,
  catalogSource: mediaSelectSchema.shape.source,
  catalogMetadata: mediaSelectSchema.shape.metadata,
  status: userMediaSelectSchema.shape.status,
  rating: userMediaSelectSchema.shape.rating,
  review: userMediaSelectSchema.shape.review,
  progress: userMediaSelectSchema.shape.progress,
  favorite: userMediaSelectSchema.shape.favorite,
  rewatches: userMediaSelectSchema.shape.rewatches,
  timeSpent: userMediaSelectSchema.shape.timeSpent,
  pagesRead: userMediaSelectSchema.shape.pagesRead,
  source: z.string().nullable(),
  tags: z.array(z.string()),
  seasonsProgress: publicSeasonsProgressSchema,
  startedAt: userMediaSelectSchema.shape.startedAt,
  completedAt: userMediaSelectSchema.shape.completedAt,
  lastProgressUpdate: userMediaSelectSchema.shape.lastProgressUpdate,
  createdAt: userMediaSelectSchema.shape.createdAt,
  updatedAt: userMediaSelectSchema.shape.updatedAt,
});

export type PublicMediaDetail = z.infer<typeof publicMediaDetailSchema>;

export const publicCollectionSummarySchema = z.object({
  publicId: z.uuid(),
  name: mediaCollectionSelectSchema.shape.name,
  description: mediaCollectionSelectSchema.shape.description,
  createdAt: mediaCollectionSelectSchema.shape.createdAt,
  itemCount: z.number().int().nonnegative(),
});

export type PublicCollectionSummary = z.infer<
  typeof publicCollectionSummarySchema
>;

export const publicLibraryResponseSchema = z.object({
  ownerName: z.string(),
  media: z.array(publicMediaSummarySchema),
  collections: z.array(publicCollectionSummarySchema),
});

export type PublicLibraryResponse = z.infer<typeof publicLibraryResponseSchema>;

export const publicCollectionResponseSchema = z.object({
  ownerName: z.string(),
  collection: publicCollectionSummarySchema,
  data: z.array(publicMediaSummarySchema),
});

export type PublicCollectionResponse = z.infer<
  typeof publicCollectionResponseSchema
>;

export const publicLinkResponseSchema = z.object({
  publicId: z.string().min(1),
});

export type PublicLinkResponse = z.infer<typeof publicLinkResponseSchema>;
