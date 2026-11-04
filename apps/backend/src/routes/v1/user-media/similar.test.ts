import { EMBEDDING_MODEL } from "@media-voyage/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db/db", async () => {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  return { db: drizzle.mock() };
});

import { getSimilarLibraryMedia } from "./queries";

describe("similar media in the owner's library", () => {
  it("scopes both the source and candidates to active entries owned by the caller", () => {
    const { sql, params } = getSimilarLibraryMedia(
      "owner-1",
      "entry-1",
    ).toSQL();

    expect(sql).toContain('"source_entry"."id" = $1');
    expect(sql).toContain('"source_entry"."user_id" = $2');
    expect(sql).toContain('"source_entry"."deleted_at" is null');
    expect(sql).toContain('"user_media"."user_id" = $3');
    expect(sql).toContain('"user_media"."deleted_at" is null');
    expect(sql).toContain('"media"."id" <> "source_media"."id"');
    expect(params.slice(0, 3)).toEqual(["entry-1", "owner-1", "owner-1"]);
  });

  it("requires usable current-model embeddings for both titles", () => {
    const { sql, params } = getSimilarLibraryMedia(
      "owner-1",
      "entry-1",
    ).toSQL();

    for (const table of ["media", "source_media"]) {
      expect(sql).toContain(`"${table}"."embedding" is not null`);
      expect(sql).toContain(`vector_norm("${table}"."embedding") > 0`);
      expect(sql).toContain(`"${table}"."embedding_model" =`);
    }
    expect(params.filter((value) => value === EMBEDDING_MODEL)).toHaveLength(2);
  });

  it("applies a strict 0.38 cosine cutoff and returns the nearest three without vectors or scores", () => {
    const { sql, params } = getSimilarLibraryMedia(
      "owner-1",
      "entry-1",
    ).toSQL();

    expect(sql).toContain(
      '1 - ("media"."embedding" <=> "source_media"."embedding") > $6',
    );
    expect(params[5]).toBe(0.38);
    expect(sql).toContain(
      'order by "media"."embedding" <=> "source_media"."embedding" asc, "media"."title" asc, "user_media"."id" asc limit $7',
    );
    expect(params[6]).toBe(3);
    expect(sql.split(" from ")[0]).not.toMatch(/embedding|similarity/);
  });
});
