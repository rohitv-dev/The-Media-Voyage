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

export const reorderMediaCollectionItemsSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: mediaCollectionItemSelectSchema.shape.id,
          position: mediaCollectionItemSelectSchema.shape.position,
        }),
      )
      .min(1),
  })
  .superRefine(({ items }, context) => {
    const ids = new Set(items.map((item) => item.id));
    if (ids.size !== items.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Collection item ids must be unique",
        path: ["items"],
      });
    }

    const positions = items.map((item) => item.position).sort((a, b) => a - b);
    const hasCompleteOrder = positions.every(
      (position, index) => position === index + 1,
    );

    if (!hasCompleteOrder) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Collection item positions must be a complete sequence starting at 1",
        path: ["items"],
      });
    }
  });

export type ReorderMediaCollectionItems = z.infer<
  typeof reorderMediaCollectionItemsSchema
>;

export const mediaCollectionFormSchema = mediaCollectionInsertSchema
  .pick({
    name: true,
    description: true,
    visibility: true,
  })
  .extend({
    name: z.string().trim().min(1, "Collection name is required"),
  });

export type MediaCollectionFormSchema = z.infer<
  typeof mediaCollectionFormSchema
>;

export const mediaCollectionUpdateSchema = mediaCollectionFormSchema
  .partial()
  .extend({
    pinned: mediaCollectionSelectSchema.shape.pinned.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one collection field is required",
  });

export type MediaCollectionUpdateSchema = z.infer<
  typeof mediaCollectionUpdateSchema
>;

/**
 * Entries inside a collection whose own visibility is stricter than the
 * collection's, i.e. the ones a viewer still would not see. Offered to the
 * owner as an explicit "bump these too?" step — a collection never overrides
 * an entry's own visibility silently.
 */
export const collectionVisibilityMismatchSchema = z.object({
  collectionVisibility: mediaCollectionSelectSchema.shape.visibility,
  entries: z.array(
    z.object({
      userMediaId: userMediaSelectSchema.shape.id,
      title: mediaSelectSchema.shape.title,
      visibility: userMediaSelectSchema.shape.visibility,
    }),
  ),
});

export type CollectionVisibilityMismatch = z.infer<
  typeof collectionVisibilityMismatchSchema
>;

export const mediaCollectionRecord = z.object({
  id: mediaCollectionSelectSchema.shape.id,
  name: mediaCollectionSelectSchema.shape.name,
  description: mediaCollectionSelectSchema.shape.description,
  visibility: mediaCollectionSelectSchema.shape.visibility,
  pinned: mediaCollectionSelectSchema.shape.pinned,
  createdAt: mediaCollectionSelectSchema.shape.createdAt,
});

export type MediaCollectionRecord = z.infer<typeof mediaCollectionRecord>;

export const mediaCollectionSummaryRecord = mediaCollectionRecord.extend({
  itemCount: z.number().int().nonnegative(),
});

export type MediaCollectionSummaryRecord = z.infer<
  typeof mediaCollectionSummaryRecord
>;

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
