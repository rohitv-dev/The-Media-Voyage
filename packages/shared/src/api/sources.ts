import z from "zod";
import { sourceInsertSchema, sourceSelectSchema } from "../schemas/sources";

export const sourceIdParamsSchema = z.object({
  sourceId: sourceSelectSchema.shape.id,
});

export type SourceIdParams = z.infer<typeof sourceIdParamsSchema>;

export const sourceRecordSchema = z.object({
  id: sourceSelectSchema.shape.id,
  name: sourceSelectSchema.shape.name,
  color: sourceSelectSchema.shape.color,
  createdAt: sourceSelectSchema.shape.createdAt,
  usageCount: z.number(),
});

export type SourceRecord = z.infer<typeof sourceRecordSchema>;

export const sourceFormSchema = sourceInsertSchema.pick({
  name: true,
  color: true,
});

export type SourceFormSchema = z.infer<typeof sourceFormSchema>;

export const updateSourceSchema = sourceFormSchema
  .partial()
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "At least one of name or color is required",
  });

export type UpdateSourceSchema = z.infer<typeof updateSourceSchema>;
