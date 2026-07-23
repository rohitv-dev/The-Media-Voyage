import { sources } from "@media-voyage/shared";
import type { UpdateSourceSchema } from "@media-voyage/shared/api";
import { eq } from "drizzle-orm";
import { db } from "../../../db/db";
import { findOwnedSource, findSourceByNormalizedName } from "./queries";

export async function updateSource(
  userId: string,
  sourceId: string,
  input: UpdateSourceSchema,
) {
  const existing = await findOwnedSource(userId, sourceId);

  if (!existing) {
    return { status: "not_found" as const };
  }

  const updates: Partial<typeof sources.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const normalizedName = input.name.trim().toLowerCase();
    const conflict = await findSourceByNormalizedName(
      userId,
      normalizedName,
      sourceId,
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
    .update(sources)
    .set(updates)
    .where(eq(sources.id, sourceId))
    .returning();

  return { status: "success" as const, source: updated };
}

export async function deleteSource(userId: string, sourceId: string) {
  const existing = await findOwnedSource(userId, sourceId);

  if (!existing) {
    return { status: "not_found" as const };
  }

  await db.delete(sources).where(eq(sources.id, sourceId));

  return { status: "success" as const };
}
