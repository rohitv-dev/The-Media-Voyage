import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { media } from "../db/schema";

export const mediaSelectSchema = createSelectSchema(media);
export const mediaInsertSchema = createInsertSchema(media);
