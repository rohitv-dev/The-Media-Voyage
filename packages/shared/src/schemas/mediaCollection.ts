import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { mediaCollection, mediaCollectionItems } from "../db/schema";

export const mediaCollectionSelectSchema = createSelectSchema(mediaCollection);
export const mediaCollectionInsertSchema = createInsertSchema(mediaCollection);
export const mediaCollectionUpdateSchema = createUpdateSchema(mediaCollection);

export const mediaCollectionItemSelectSchema =
  createSelectSchema(mediaCollectionItems);
export const mediaCollectionItemInsertSchema =
  createInsertSchema(mediaCollectionItems);
export const mediaCollectionItemUpdateSchema =
  createUpdateSchema(mediaCollectionItems);
