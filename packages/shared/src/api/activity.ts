import z from "zod";
import { activityActionEnum, mediaTypeEnum } from "../db/schema";

export const activityFilterSchema = z.object({
  action: z.enum(activityActionEnum.enumValues).optional(),
  type: z.enum(mediaTypeEnum.enumValues).optional(),
  search: z.string().trim().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export type ActivityFilters = z.infer<typeof activityFilterSchema>;

export const activityListQuerySchema = activityFilterSchema
  .extend({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    // API date bounds are instants, with an exclusive upper bound.
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
  })
  .refine(({ from, to }) => !from || !to || Date.parse(from) < Date.parse(to), {
    path: ["to"],
    message: "The end of the date range must follow its start",
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
