import { z } from "zod";

/** Shared name/color validation for user-defined named entities (tags, sources). */
export const namedEntityInsertOverrides = {
  name: z.string().trim().min(1).max(50),
  color: z.string().trim().min(1).max(20).nullable().optional(),
};
