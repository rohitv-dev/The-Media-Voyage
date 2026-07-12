import z from "zod";
import { mediaCollectionInsertSchema, mediaCollectionSelectSchema } from "../schemas/mediaCollection";

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

export type MediaCollectionFormSchema = z.infer<typeof mediaCollectionFormSchema>;

export const mediaCollectionRecord = z.object({
  id: mediaCollectionSelectSchema.shape.id,
  name: mediaCollectionSelectSchema.shape.name,
  description: mediaCollectionSelectSchema.description,
  visiblity: mediaCollectionSelectSchema.shape.visibility,
  createdAt: mediaCollectionSelectSchema.shape.createdAt,
});

export type MediaCollectionRecord = z.infer<typeof mediaCollectionRecord>;
