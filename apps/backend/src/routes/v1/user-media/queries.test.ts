import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: { select: selectMock },
}));

import { searchUserMediaHybrid } from "./queries";

function createSelectBuilder() {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    as: vi.fn(),
  };

  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);

  return builder;
}

function renderSql(value: Parameters<PgDialect["sqlToQuery"]>[0]) {
  return new PgDialect().sqlToQuery(value);
}

describe("searchUserMediaHybrid", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("builds lexical and semantic candidates before reciprocal-rank fusion", () => {
    const lexicalMatches = createSelectBuilder();
    const semanticMatches = createSelectBuilder();
    const fusedResults = createSelectBuilder();

    lexicalMatches.as.mockReturnValue({
      userMediaId: sql.raw('"lexical_user_media_id"'),
      lexicalRank: sql.raw('"lexical_rank"'),
    });
    semanticMatches.as.mockReturnValue({
      userMediaId: sql.raw('"semantic_user_media_id"'),
      semanticRank: sql.raw('"semantic_rank"'),
    });
    selectMock
      .mockReturnValueOnce(lexicalMatches)
      .mockReturnValueOnce(semanticMatches)
      .mockReturnValueOnce(fusedResults);

    const result = searchUserMediaHybrid(
      "user-1",
      "atmospheric space horror",
      [0.1, 0.2, 0.3],
    );

    expect(result).toBe(fusedResults);
    expect(selectMock).toHaveBeenCalledTimes(3);
    expect(lexicalMatches.limit).toHaveBeenCalledWith(50);
    expect(semanticMatches.limit).toHaveBeenCalledWith(50);
    expect(fusedResults.limit).toHaveBeenCalledWith(20);
    expect(fusedResults.leftJoin).toHaveBeenCalledTimes(2);

    const lexicalQuery = renderSql(lexicalMatches.where.mock.calls[0][0]);
    expect(lexicalQuery.sql).toContain("websearch_to_tsquery");
    expect(lexicalQuery.sql).toContain("@@");
    expect(lexicalQuery.params).toContain("atmospheric space horror");

    const fusedOrder = renderSql(fusedResults.orderBy.mock.calls[0][0]);
    expect(fusedOrder.sql).toContain("coalesce");
    expect(fusedOrder.sql).toContain('"lexical_rank"');
    expect(fusedOrder.sql).toContain('"semantic_rank"');
    expect(fusedOrder.params).toContain(60);
  });
});
