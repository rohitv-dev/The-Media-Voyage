import z from "zod";
import { tagInsertSchema, tagSelectSchema } from "../schemas/tags";

export const tagIdParamsSchema = z.object({
  tagId: tagSelectSchema.shape.id,
});

export type TagIdParams = z.infer<typeof tagIdParamsSchema>;

export const tagRecordSchema = z.object({
  id: tagSelectSchema.shape.id,
  name: tagSelectSchema.shape.name,
  color: tagSelectSchema.shape.color,
  createdAt: tagSelectSchema.shape.createdAt,
  usageCount: z.number(),
});

export type TagRecord = z.infer<typeof tagRecordSchema>;

export const tagFormSchema = tagInsertSchema.pick({ name: true, color: true });

export type TagFormSchema = z.infer<typeof tagFormSchema>;

export const updateTagSchema = tagFormSchema
  .partial()
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "At least one of name or color is required",
  });

export type UpdateTagSchema = z.infer<typeof updateTagSchema>;
