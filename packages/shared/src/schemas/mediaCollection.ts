import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { mediaCollection, mediaCollectionItems } from "../db/schema";

export const mediaCollectionSelectSchema = createSelectSchema(mediaCollection);
export const mediaCollectionInsertSchema = createInsertSchema(mediaCollection);

export const mediaCollectionItemSelectSchema =
  createSelectSchema(mediaCollectionItems);
