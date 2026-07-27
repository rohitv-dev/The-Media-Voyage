import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sources } from "../db/schema";
import { namedEntityInsertOverrides } from "./namedEntityFields";

export const sourceSelectSchema = createSelectSchema(sources);
export const sourceInsertSchema = createInsertSchema(
  sources,
  namedEntityInsertOverrides,
);
