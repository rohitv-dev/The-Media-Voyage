import { sources, tags } from "@media-voyage/shared";
import { and, count, eq, ne } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db } from "../../db/db";

/**
 * Shared query/service helpers for "named entity" resources — user-owned
 * lookup tables that carry a `name`, optional `color`, and a normalized-name
 * uniqueness constraint. `tags` and `sources` are structurally identical, so
 * their CRUD logic lives here instead of being copy-pasted per resource.
 */

// Both tables expose the same column shape; a concrete union keeps the
// helpers type-safe without resorting to `any` or fighting Drizzle's
// query-builder generics.
type NamedEntityTable = typeof tags | typeof sources;

// tags and sources share an identical row shape, so one select type covers
// both.
export type NamedEntityRow = typeof tags.$inferSelect;

type NamedEntityInput = {
  name?: string;
  color?: string | null;
};

type UpdateResult =
  | { status: "not_found" }
  | { status: "duplicate" }
  | { status: "success"; entity: NamedEntityRow };

type DeleteResult = { status: "not_found" } | { status: "success" };

/**
 * List every entity owned by the user together with a usage count of how many
 * library rows reference it. `usageJoinColumn` is the foreign-key column on
 * the referencing table (e.g. `userMediaTags.tagId`, `userMedia.sourceId`).
 */
export function listNamedEntitiesWithUsage(
  table: NamedEntityTable,
  usageJoinColumn: PgColumn,
  userId: string,
) {
  return db
    .select({
      id: table.id,
      name: table.name,
      color: table.color,
      createdAt: table.createdAt,
      usageCount: count(usageJoinColumn),
    })
    .from(table)
    .leftJoin(usageJoinColumn.table, eq(usageJoinColumn, table.id))
    .where(eq(table.userId, userId))
    .groupBy(table.id)
    .orderBy(table.name);
}

export async function findOwnedNamedEntity(
  table: NamedEntityTable,
  userId: string,
  id: string,
): Promise<NamedEntityRow | null> {
  const [entity] = await db
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId)))
    .limit(1);

  return entity ?? null;
}

async function findByNormalizedName(
  table: NamedEntityTable,
  userId: string,
  normalizedName: string,
  excludeId: string,
): Promise<NamedEntityRow | null> {
  const [entity] = await db
    .select()
    .from(table)
    .where(
      and(
        eq(table.userId, userId),
        eq(table.normalizedName, normalizedName),
        ne(table.id, excludeId),
      ),
    )
    .limit(1);

  return entity ?? null;
}

export async function updateNamedEntity(
  table: NamedEntityTable,
  userId: string,
  id: string,
  input: NamedEntityInput,
): Promise<UpdateResult> {
  const existing = await findOwnedNamedEntity(table, userId, id);

  if (!existing) {
    return { status: "not_found" };
  }

  const updates: Partial<NamedEntityRow> = { updatedAt: new Date() };

  if (input.name !== undefined) {
    const normalizedName = input.name.trim().toLowerCase();
    const conflict = await findByNormalizedName(
      table,
      userId,
      normalizedName,
      id,
    );

    if (conflict) {
      return { status: "duplicate" };
    }

    updates.name = input.name.trim();
    updates.normalizedName = normalizedName;
  }

  if (input.color !== undefined) {
    updates.color = input.color;
  }

  const [updated] = await db
    .update(table)
    .set(updates)
    .where(eq(table.id, id))
    .returning();

  return { status: "success", entity: updated };
}

export async function deleteNamedEntity(
  table: NamedEntityTable,
  userId: string,
  id: string,
): Promise<DeleteResult> {
  const existing = await findOwnedNamedEntity(table, userId, id);

  if (!existing) {
    return { status: "not_found" };
  }

  await db.delete(table).where(eq(table.id, id));

  return { status: "success" };
}
