import { expect, it, vi } from "vitest";

vi.mock("@/db/db", async () => {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  return { db: drizzle.mock() };
});

import { listMediaCollections } from "./queries";

it("limits ordered collection cover previews to the owner's active entries", () => {
  const query = listMediaCollections("owner-1").toSQL();
  const preview = query.sql.slice(
    query.sql.indexOf("array("),
    query.sql.indexOf("limit 3") + "limit 3".length,
  );

  expect(preview).toContain(
    '"media_collection_items"."collection_id" = "media_collection"."id"',
  );
  expect(preview).toMatch(/"user_media"\."user_id" = \$\d+/);
  expect(preview).toContain('"user_media"."deleted_at" is null');
  expect(preview).toContain('"media"."image_url" is not null');
  expect(preview).toContain('"media"."image_url" <> \'\'');
  expect(preview).toContain(
    'order by "media_collection_items"."position", "media_collection_items"."created_at", "media_collection_items"."id"',
  );
  expect(preview).toContain("limit 3");
  expect(query.sql).toMatch(/where "media_collection"\."user_id" = \$\d+/);
  expect(query.params).toEqual(["owner-1", "owner-1", "owner-1"]);
});
