import { activityListQuerySchema } from "@media-voyage/shared/api";
import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }));
vi.mock("@/db/db", () => ({ db: { select: selectMock } }));

import { listActivity } from "./service";

function createSelectBuilder() {
  return {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
  };
}

it("applies combined owner-scoped filters to both rows and totals before pagination", async () => {
  const rows = createSelectBuilder();
  const totals = createSelectBuilder();
  totals.where.mockResolvedValue([{ count: 27 }]);
  selectMock.mockReturnValueOnce(rows).mockReturnValueOnce(totals);

  expect(
    await listActivity(
      "owner-1",
      activityListQuerySchema.parse({
        page: 2,
        action: "media_updated",
        type: "movie",
        search: "  Dune_100%  ",
        from: "2026-10-31T18:30:00.000Z",
        to: "2026-11-02T18:30:00.000Z",
      }),
    ),
  ).toEqual({ data: [], total: 27, page: 2, pageSize: 20 });

  const dialect = new PgDialect();
  const condition = dialect.sqlToQuery(rows.where.mock.calls[0][0]);
  expect(condition).toEqual(dialect.sqlToQuery(totals.where.mock.calls[0][0]));
  expect(condition.sql).toContain('"activity_events"."user_id" =');
  expect(condition.sql).toContain('"activity_events"."type" =');
  expect(condition.sql).toContain('"media"."type" =');
  expect(condition.sql).toContain("->>'mediaTitle'");
  expect(condition.sql).toContain(" ilike ");
  expect(condition.sql).toContain('"activity_events"."created_at" >=');
  expect(condition.sql).toContain('"activity_events"."created_at" <');
  expect(condition.params).toEqual([
    "owner-1",
    "media_updated",
    "movie",
    "%Dune\\_100\\%%",
    "2026-10-31T18:30:00.000Z",
    "2026-11-02T18:30:00.000Z",
  ]);
  expect(rows.limit).toHaveBeenCalledWith(20);
  expect(rows.offset).toHaveBeenCalledWith(20);
});
