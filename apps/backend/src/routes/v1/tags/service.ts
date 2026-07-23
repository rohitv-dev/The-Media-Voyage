import { tags } from "@media-voyage/shared";
import type { UpdateTagSchema } from "@media-voyage/shared/api";
import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import { findOwnedTag, findTagByNormalizedName } from "./queries";

export async function updateTag(
  userId: string,
  tagId: string,
  input: UpdateTagSchema,
) {
  const existing = await findOwnedTag(userId, tagId);

  if (!existing) {
    return { status: "not_found" as const };
  }

  const updates: Partial<typeof tags.$inferInsert> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const normalizedName = input.name.trim().toLowerCase();
    const conflict = await findTagByNormalizedName(
      userId,
      normalizedName,
      tagId,
    );

    if (conflict) {
      return { status: "duplicate" as const };
    }

    updates.name = input.name.trim();
    updates.normalizedName = normalizedName;
  }

  if (input.color !== undefined) {
    updates.color = input.color;
  }

  const [updated] = await db
    .update(tags)
    .set(updates)
    .where(eq(tags.id, tagId))
    .returning();

  return { status: "success" as const, tag: updated };
}

export async function deleteTag(userId: string, tagId: string) {
  const existing = await findOwnedTag(userId, tagId);

  if (!existing) {
    return { status: "not_found" as const };
  }

  await db.delete(tags).where(eq(tags.id, tagId));

  return { status: "success" as const };
}
