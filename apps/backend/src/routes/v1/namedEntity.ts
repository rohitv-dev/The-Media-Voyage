import { sources, tags } from "@media-voyage/shared";
import { and, count, eq, ne } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import type { FastifyReply } from "fastify";
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

type CreateResult =
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

async function findByNormalizedNameAny(
  table: NamedEntityTable,
  userId: string,
  normalizedName: string,
): Promise<NamedEntityRow | null> {
  const [entity] = await db
    .select()
    .from(table)
    .where(
      and(eq(table.userId, userId), eq(table.normalizedName, normalizedName)),
    )
    .limit(1);

  return entity ?? null;
}

export async function createNamedEntity(
  table: NamedEntityTable,
  userId: string,
  input: { name: string; color?: string | null },
): Promise<CreateResult> {
  const normalizedName = input.name.trim().toLowerCase();
  const conflict = await findByNormalizedNameAny(table, userId, normalizedName);

  if (conflict) {
    return { status: "duplicate" };
  }

  const [created] = await db
    .insert(table)
    .values({
      userId,
      name: input.name.trim(),
      normalizedName,
      color: input.color ?? null,
    })
    .returning();

  return { status: "success", entity: created };
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

/**
 * Map an {@link updateNamedEntity} result onto the HTTP response. `label` is
 * the lowercase entity noun (e.g. "tag", "source") used in the error copy.
 */
export function sendNamedEntityUpdate(
  reply: FastifyReply,
  result: UpdateResult,
  label: string,
) {
  const Label = label.charAt(0).toUpperCase() + label.slice(1);

  switch (result.status) {
    case "not_found":
      return reply.status(404).send({ error: `${Label} not found` });
    case "duplicate":
      return reply
        .status(409)
        .send({ error: `A ${label} with that name already exists` });
    case "success":
      return reply.send(result.entity);
  }
}

/** Map a {@link createNamedEntity} result onto the HTTP response. */
export function sendNamedEntityCreate(
  reply: FastifyReply,
  result: CreateResult,
  label: string,
) {
  if (result.status === "duplicate") {
    return reply
      .status(409)
      .send({ error: `A ${label} with that name already exists` });
  }

  return reply.status(201).send(result.entity);
}

/** Map a {@link deleteNamedEntity} result onto the HTTP response. */
export function sendNamedEntityDelete(
  reply: FastifyReply,
  result: DeleteResult,
  label: string,
) {
  if (result.status === "not_found") {
    const Label = label.charAt(0).toUpperCase() + label.slice(1);
    return reply.status(404).send({ error: `${Label} not found` });
  }

  return reply.status(200).send({ success: true });
}
