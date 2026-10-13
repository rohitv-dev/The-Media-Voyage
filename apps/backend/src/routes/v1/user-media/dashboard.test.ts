import { type SQL, sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));
vi.mock("@/db/db", () => ({ db: { select: selectMock } }));

import { getDashboardStats } from "./queries";

function createSelectBuilder(rows: unknown[] = []) {
  const promise = Promise.resolve(rows);
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    then: promise.then.bind(promise),
  };
  for (const method of [
    "from",
    "innerJoin",
    "where",
    "groupBy",
    "orderBy",
    "limit",
  ] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
}

function renderSql(value: SQL) {
  return new PgDialect().sqlToQuery(value);
}

describe("dashboard statistics", () => {
  beforeEach(() => selectMock.mockReset());

  it("returns zero counts and empty additions, completions, and suggestions for an empty library", async () => {
    selectMock.mockImplementation(() => createSelectBuilder());
    const result = await getDashboardStats("owner-1");

    expect(Object.values(result.summary).every((value) => value === 0)).toBe(
      true,
    );
    expect(result.addedTrend).toEqual([]);
    expect(result.completionTrend).toEqual([]);
    expect(result.nearlyFinished).toEqual([]);
  });

  it("uses recorded dates, counts each completion by type, and scopes new queries to the owner's active library", async () => {
    const completionRows = [
      { month: "2026-10", count: 4, movie: 1, show: 1, book: 1, game: 1 },
    ];
    const addedRows = [{ month: "2026-10", count: 6 }];
    const queries = Array.from({ length: 9 }, (_, index) =>
      createSelectBuilder(
        index === 5 ? completionRows : index === 7 ? addedRows : [],
      ),
    );
    queries.forEach((query) => selectMock.mockReturnValueOnce(query));

    const result = await getDashboardStats("owner-1");
    expect(result.completionTrend).toEqual(completionRows);
    expect(result.addedTrend).toEqual(addedRows);

    for (const index of [5, 7, 8]) {
      const condition = renderSql(queries[index].where.mock.calls[0][0]);
      expect(condition.sql).toContain('"user_media"."user_id"');
      expect(condition.sql).toContain('"deleted_at" is null');
      expect(condition.params).toContain("owner-1");
    }
    const completedCondition = renderSql(queries[5].where.mock.calls[0][0]);
    expect(completedCondition.params).toContain("completed");
    expect(completedCondition.sql).toContain('"completed_at" is not null');
    expect(renderSql(selectMock.mock.calls[5][0].month).sql).toContain(
      '"completed_at"',
    );
    expect(renderSql(selectMock.mock.calls[7][0].month).sql).toContain(
      '"created_at"',
    );
    for (const type of ["movie", "show", "book", "game"]) {
      expect(renderSql(selectMock.mock.calls[5][0][type]).sql).toContain(
        `filter (where "media"."type" = '${type}')`,
      );
    }
  });

  it("ranks at most five partially finished active titles by progress, then recency", async () => {
    const queries = Array.from({ length: 9 }, () => createSelectBuilder());
    queries.forEach((query) => selectMock.mockReturnValueOnce(query));
    await getDashboardStats("owner-1");

    const query = queries[8];
    const condition = renderSql(query.where.mock.calls[0][0]);
    expect(condition.params).toEqual([
      "owner-1",
      "in_progress",
      "playing",
      "revisiting",
      0,
      100,
    ]);
    expect(condition.sql).toContain('"progress" >');
    expect(condition.sql).toContain('"progress" <');
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(
      query.orderBy.mock.calls[0].map((value: SQL) => renderSql(value).sql),
    ).toEqual([
      '"user_media"."progress" desc',
      '"user_media"."last_progress_update" desc',
      '"user_media"."id" asc',
    ]);
  });
});
