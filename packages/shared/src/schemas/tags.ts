import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { tags } from "../db/schema";
import { namedEntityInsertOverrides } from "./namedEntityFields";

export const tagSelectSchema = createSelectSchema(tags);
export const tagInsertSchema = createInsertSchema(
  tags,
  namedEntityInsertOverrides,
);
