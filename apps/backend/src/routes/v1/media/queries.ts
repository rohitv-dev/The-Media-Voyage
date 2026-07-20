import { media } from "@media-voyage/shared";
import type { MediaSearchQuery } from "@media-voyage/shared/api";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/db";
import { mediaSearchSelect } from "./selects";

export function searchLocalMedia({ q, type }: MediaSearchQuery) {
  return db
    .select(mediaSearchSelect)
    .from(media)
    .where(and(ilike(media.title, `%${q}%`), eq(media.type, type)))
    .limit(10);
}
