import z from "zod";
import {
  mediaCollectionInsertSchema,
  mediaCollectionItemSelectSchema,
  mediaCollectionSelectSchema,
} from "../schemas/mediaCollection";
import { mediaSelectSchema } from "../schemas/mediaSchema";

export const mediaCollectionSchema = z.object({
  id: mediaCollectionSelectSchema.shape.id,
  name: mediaCollectionSelectSchema.shape.name,
  description: mediaCollectionSelectSchema.shape.description,
});

export type MediaCollection = z.infer<typeof mediaCollectionSchema>;

export const mediaCollectionFormSchema = mediaCollectionInsertSchema.pick({
  name: true,
  description: true,
  visibility: true,
});

export type MediaCollectionFormSchema = z.infer<
  typeof mediaCollectionFormSchema
>;

export const mediaCollectionRecord = z.object({
  id: mediaCollectionSelectSchema.shape.id,
  name: mediaCollectionSelectSchema.shape.name,
  description: mediaCollectionSelectSchema.shape.description,
  visibility: mediaCollectionSelectSchema.shape.visibility,
  createdAt: mediaCollectionSelectSchema.shape.createdAt,
});

export type MediaCollectionRecord = z.infer<typeof mediaCollectionRecord>;

export const mediaCollectionItemRecord = z.object({
  id: mediaCollectionItemSelectSchema.shape.id,
  userMediaId: mediaCollectionItemSelectSchema.shape.userMediaId,
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  position: mediaCollectionItemSelectSchema.shape.position,
  createdAt: mediaCollectionItemSelectSchema.shape.createdAt,
});

export type MediaCollectionItemRecord = z.infer<
  typeof mediaCollectionItemRecord
>;
