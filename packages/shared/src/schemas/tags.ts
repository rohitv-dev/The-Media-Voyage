import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";
import { tags, userMediaTags } from "../db/schema";

export const tagSelectSchema = createSelectSchema(tags);
export const tagInsertSchema = createInsertSchema(tags, {
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(20).nullable().optional(),
});
export const tagUpdateSchema = createUpdateSchema(tags);

export const userMediaTagSelectSchema = createSelectSchema(userMediaTags);
export const userMediaTagInsertSchema = createInsertSchema(userMediaTags);
