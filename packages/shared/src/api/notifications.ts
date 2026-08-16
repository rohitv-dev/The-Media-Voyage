import z from "zod";
import { notificationTypeEnum, recommendationOutcomeEnum } from "../db/schema";

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export const notificationRecordSchema = z.object({
  id: z.uuid(),
  type: z.enum(notificationTypeEnum.enumValues),
  actorName: z.string(),
  actorImage: z.string().nullable(),
  userMediaId: z.uuid().nullable(),
  recommendationId: z.uuid().nullable(),
  recommendationOutcome: z
    .enum(recommendationOutcomeEnum.enumValues)
    .nullable(),
  mediaTitle: z.string().nullable(),
  seenAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export type NotificationRecord = z.infer<typeof notificationRecordSchema>;

export const notificationListResponseSchema = z.object({
  data: z.array(notificationRecordSchema),
  total: z.number().int().nonnegative(),
  unseenCount: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type NotificationListResponse = z.infer<
  typeof notificationListResponseSchema
>;

export const markNotificationsSeenResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export type MarkNotificationsSeenResponse = z.infer<
  typeof markNotificationsSeenResponseSchema
>;
