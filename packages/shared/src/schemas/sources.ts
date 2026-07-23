import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sources } from "../db/schema";

export const sourceSelectSchema = createSelectSchema(sources);
export const sourceInsertSchema = createInsertSchema(sources, {
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(20).nullable().optional(),
});
