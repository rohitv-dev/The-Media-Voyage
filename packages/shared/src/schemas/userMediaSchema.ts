import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { mediaTypeEnum, statusEnum, userMedia, visibilityEnum } from "../db/schema";
import { z } from "zod";

export const userMediaSelectSchema = createSelectSchema(userMedia);
export const userMediaInsertSchema = createInsertSchema(userMedia, {
  startedAt: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
});
export const userMediaUpdateSchema = createUpdateSchema(userMedia);

export const mediaTypeEnumValues = mediaTypeEnum.enumValues;
export const statusEnumValues = statusEnum.enumValues;
export const visibilityEnumValues = visibilityEnum.enumValues;

export type Status = (typeof statusEnumValues)[number];
