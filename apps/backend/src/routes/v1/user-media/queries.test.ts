import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FUZZY_TITLE_SEARCH_CONFIG } from "@media-voyage/shared/api";

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: { select: selectMock },
}));

import {
  filterUserMedia,
  searchUserMedia,
  searchUserMediaHybrid,
} from "./queries";

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
    const fuzzyTitleMatches = createSelectBuilder();
    const fusedResults = createSelectBuilder();

    lexicalMatches.as.mockReturnValue({
      userMediaId: sql.raw('"lexical_user_media_id"'),
      lexicalRank: sql.raw('"lexical_rank"'),
    });
    semanticMatches.as.mockReturnValue({
      userMediaId: sql.raw('"semantic_user_media_id"'),
      semanticRank: sql.raw('"semantic_rank"'),
    });
    fuzzyTitleMatches.as.mockReturnValue({
      userMediaId: sql.raw('"fuzzy_title_user_media_id"'),
      fuzzyTitleRank: sql.raw('"fuzzy_title_rank"'),
    });
    selectMock
      .mockReturnValueOnce(lexicalMatches)
      .mockReturnValueOnce(semanticMatches)
      .mockReturnValueOnce(fuzzyTitleMatches)
      .mockReturnValueOnce(fusedResults);

    const result = searchUserMediaHybrid(
      "user-1",
      "atmospheric space horror",
      [0.1, 0.2, 0.3],
    );

    expect(result).toBe(fusedResults);
    expect(selectMock).toHaveBeenCalledTimes(4);
    expect(lexicalMatches.limit).toHaveBeenCalledWith(50);
    expect(semanticMatches.limit).toHaveBeenCalledWith(50);
    expect(fuzzyTitleMatches.limit).toHaveBeenCalledWith(50);
    expect(fusedResults.limit).toHaveBeenCalledWith(20);
    expect(fusedResults.leftJoin).toHaveBeenCalledTimes(3);

    const lexicalQuery = renderSql(lexicalMatches.where.mock.calls[0][0]);
    expect(lexicalQuery.sql).toContain("websearch_to_tsquery");
    expect(lexicalQuery.sql).toContain("@@");
    expect(lexicalQuery.params).toContain("atmospheric space horror");

    const fuzzyTitleQuery = renderSql(fuzzyTitleMatches.where.mock.calls[0][0]);
    expect(fuzzyTitleQuery.sql).toContain("similarity");
    expect(fuzzyTitleQuery.sql).toContain(" % ");
    expect(fuzzyTitleQuery.params).toContain("atmospheric space horror");

    const fuzzyOrder = renderSql(fuzzyTitleMatches.orderBy.mock.calls[0][0]);
    expect(fuzzyOrder.sql).toContain("<->");

    const fusedOrder = renderSql(fusedResults.orderBy.mock.calls[0][0]);
    expect(fusedOrder.sql).toContain("coalesce");
    expect(fusedOrder.sql).toContain('"lexical_rank"');
    expect(fusedOrder.sql).toContain('"semantic_rank"');
    expect(fusedOrder.sql).toContain('"fuzzy_title_rank"');
    expect(fusedOrder.params).toContain(60);
  });
});

describe("title search queries", () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it("preserves substring matches and adds fuzzy title matches", () => {
    const results = createSelectBuilder();
    selectMock.mockReturnValue(results);

    expect(searchUserMedia("user-1", "interstellr")).toBe(results);

    const whereQuery = renderSql(results.where.mock.calls[0][0]);
    expect(whereQuery.sql).toContain("ilike");
    expect(whereQuery.sql).toContain("similarity");
    expect(whereQuery.sql).toContain(" % ");
    expect(whereQuery.sql).toContain(" > ");
    expect(whereQuery.params).toContain("%interstellr%");
    expect(whereQuery.params).toContain("interstellr");
    expect(whereQuery.params).toContain(0.3);
  });

  it("keeps short title lookups substring-only", () => {
    const results = createSelectBuilder();
    selectMock.mockReturnValue(results);

    searchUserMedia(
      "user-1",
      "a".repeat(FUZZY_TITLE_SEARCH_CONFIG.minimumQueryLength - 1),
    );

    const whereQuery = renderSql(results.where.mock.calls[0][0]);
    expect(whereQuery.sql).toContain("ilike");
    expect(whereQuery.sql).not.toContain("similarity");
    expect(whereQuery.sql).not.toContain(" % ");
  });

  it("applies the same title predicate to the Filter Card query", () => {
    const results = createSelectBuilder();
    selectMock.mockReturnValue(results);

    filterUserMedia("user-1", {
      search: "interstellr",
      sort: "title",
      order: "asc",
    });

    const whereQuery = renderSql(results.where.mock.calls[0][0]);
    expect(whereQuery.sql).toContain("ilike");
    expect(whereQuery.sql).toContain("similarity");
    expect(whereQuery.sql).toContain(" % ");
  });
});
