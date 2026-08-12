// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildFilterQuery } from "./queries";

describe("filter query serialization", () => {
  it("preserves numeric zero and false", () => {
    const query = buildFilterQuery({ maxRating: 0, favorite: false });
    const params = new URLSearchParams(query);

    expect(params.get("maxRating")).toBe("0");
    expect(params.get("favorite")).toBe("false");
  });

  it("omits only blank values and empty arrays", () => {
    const query = buildFilterQuery({
      missing: undefined,
      cleared: null,
      blank: "",
      empty: [],
      search: "Dune",
      statuses: ["planned"],
    });
    const params = new URLSearchParams(query);

    expect([...params.keys()]).toEqual(["search", "statuses"]);
    expect(params.get("statuses")).toBe('["planned"]');
  });
});
