import { sources, tags } from "@media-voyage/shared";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { insertMock, selectMock, updateMock } = vi.hoisted(() => ({
  insertMock: vi.fn(),
  selectMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: {
    insert: insertMock,
    select: selectMock,
    update: updateMock,
  },
}));

import { createNamedEntity, updateNamedEntity } from "./namedEntity";

const USER_ID = "user-1";
const ENTRY_ID = "22222222-2222-4222-8222-222222222222";

const namedEntityTables = [
  { label: "tag" as const, table: tags },
  { label: "source" as const, table: sources },
];

function createSelectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };

  builder.from.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

function createUpdateBuilder(result: unknown[]) {
  const builder = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };

  builder.set.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  return builder;
}

function renderWhere(builder: ReturnType<typeof createSelectBuilder>) {
  const where = builder.where.mock.calls.at(-1)?.[0];
  return new PgDialect().sqlToQuery(where);
}

describe.each(namedEntityTables)("$label named entities", ({ label, table }) => {
  beforeEach(() => {
    insertMock.mockReset();
    selectMock.mockReset();
    updateMock.mockReset();
  });

  it("rejects duplicate creation with the owner and normalized-name predicates", async () => {
    const lookup = createSelectBuilder([{ id: "existing" }]);
    selectMock.mockReturnValue(lookup);

    await expect(
      createNamedEntity(table, USER_ID, { name: "  Same Name  " }, label),
    ).rejects.toThrow(`A ${label} with that name already exists`);

    const query = renderWhere(lookup);
    expect(query.sql).toContain('"user_id"');
    expect(query.sql).toContain('"normalized_name"');
    expect(query.params).toEqual(expect.arrayContaining([USER_ID, "same name"]));
    expect(query.sql).not.toContain("<>");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("permits an update that keeps its own normalized name", async () => {
    const ownedLookup = createSelectBuilder([{ id: ENTRY_ID }]);
    const duplicateLookup = createSelectBuilder([]);
    const update = createUpdateBuilder([{ id: ENTRY_ID }]);
    selectMock
      .mockReturnValueOnce(ownedLookup)
      .mockReturnValueOnce(duplicateLookup);
    updateMock.mockReturnValue(update);

    await expect(
      updateNamedEntity(
        table,
        USER_ID,
        ENTRY_ID,
        { name: "  Same Name  " },
        label,
      ),
    ).resolves.toEqual({ id: ENTRY_ID });

    const query = renderWhere(duplicateLookup);
    expect(query.sql).toContain("<>");
    expect(query.params).toEqual(
      expect.arrayContaining([USER_ID, "same name", ENTRY_ID]),
    );
    expect(updateMock).toHaveBeenCalledWith(table);
  });

  it("rejects a name used by another owned record", async () => {
    const ownedLookup = createSelectBuilder([{ id: ENTRY_ID }]);
    const duplicateLookup = createSelectBuilder([{ id: "other" }]);
    selectMock
      .mockReturnValueOnce(ownedLookup)
      .mockReturnValueOnce(duplicateLookup);

    await expect(
      updateNamedEntity(
        table,
        USER_ID,
        ENTRY_ID,
        { name: "Other" },
        label,
      ),
    ).rejects.toThrow(`A ${label} with that name already exists`);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("rejects a missing or foreign update through the owner lookup", async () => {
    const lookup = createSelectBuilder([]);
    selectMock.mockReturnValue(lookup);

    await expect(
      updateNamedEntity(table, USER_ID, ENTRY_ID, { color: "#fff" }, label),
    ).rejects.toThrow(`${label === "tag" ? "Tag" : "Source"} not found`);

    const query = renderWhere(lookup);
    expect(query.sql).toContain('"id"');
    expect(query.sql).toContain('"user_id"');
    expect(query.params).toEqual(expect.arrayContaining([ENTRY_ID, USER_ID]));
    expect(updateMock).not.toHaveBeenCalled();
  });
});
