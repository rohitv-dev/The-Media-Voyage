import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";
import { mediaCollection } from "../db/schema";

export const mediaCollectionSelectSchema = createSelectSchema(mediaCollection);
export const mediaCollectionInsertSchema = createInsertSchema(mediaCollection);
export const mediaCollectionUpdateSchema = createUpdateSchema(mediaCollection);
