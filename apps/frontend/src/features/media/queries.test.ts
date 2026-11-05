// @vitest-environment jsdom

import { expect, it } from "vitest";
import { buildFilterQuery } from "./queries";

it("serializes selected filters and omits blank values", () => {
  const query = buildFilterQuery({
    minRating: undefined,
    maxRating: 0,
    favorite: false,
    createdFrom: null,
    createdTo: "",
    tags: [],
    search: "Dune",
    status: ["planned"],
  });
  const url = new URL(
    `/user-media/filter/page${query}`,
    "https://example.test",
  );

  expect(Object.fromEntries(url.searchParams)).toEqual({
    maxRating: "0",
    favorite: "false",
    search: "Dune",
    status: '["planned"]',
  });
});
