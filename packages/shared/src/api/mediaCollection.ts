import z from "zod";
import {
  mediaCollectionInsertSchema,
  mediaCollectionItemSelectSchema,
  mediaCollectionSelectSchema,
} from "../schemas/mediaCollection";
import { mediaSelectSchema } from "../schemas/mediaSchema";
import { userMediaSelectSchema } from "../schemas/userMediaSchema";
import { mediaRecordSchema } from "./userMedia";

export const mediaCollectionIdParamsSchema = z.object({
  collectionId: mediaCollectionSelectSchema.shape.id,
});

export type MediaCollectionIdParams = z.infer<
  typeof mediaCollectionIdParamsSchema
>;

export const mediaCollectionItemParamsSchema =
  mediaCollectionIdParamsSchema.extend({
    itemId: mediaCollectionItemSelectSchema.shape.id,
  });

export type MediaCollectionItemParams = z.infer<
  typeof mediaCollectionItemParamsSchema
>;

export const addMediaCollectionItemSchema = z.object({
  userMediaId: userMediaSelectSchema.shape.id,
});

export type AddMediaCollectionItem = z.infer<
  typeof addMediaCollectionItemSchema
>;

export const reorderMediaCollectionItemsSchema = z.object({
  items: z.array(
    z.object({
      id: mediaCollectionItemSelectSchema.shape.id,
      position: mediaCollectionItemSelectSchema.shape.position,
    }),
  ),
});

export type ReorderMediaCollectionItems = z.infer<
  typeof reorderMediaCollectionItemsSchema
>;

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

export const mediaCollectionItemDetailedRecord = mediaRecordSchema.extend({
  position: mediaCollectionItemSelectSchema.shape.position,
});

export type MediaCollectionItemDetailedRecord = z.infer<
  typeof mediaCollectionItemDetailedRecord
>;
