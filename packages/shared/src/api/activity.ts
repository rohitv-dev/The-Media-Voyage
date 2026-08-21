import z from "zod";
import { activityActionEnum } from "../db/schema";

export const activityListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;

export const activityDetailsSchema = z.record(z.string(), z.unknown());

export type ActivityDetails = z.infer<typeof activityDetailsSchema>;

export const activityRecordSchema = z.object({
  id: z.uuid(),
  type: z.enum(activityActionEnum.enumValues),
  userMediaId: z.uuid().nullable(),
  details: activityDetailsSchema,
  createdAt: z.coerce.date(),
});

export type ActivityRecord = z.infer<typeof activityRecordSchema>;

export const activityListResponseSchema = z.object({
  data: z.array(activityRecordSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;
