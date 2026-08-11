import type { SourceMediaRecord } from "@media-voyage/shared/api";
import { describe, expect, it } from "vitest";
import { hydrateOpenLibrary } from "./openLibrary";

describe("hydrateOpenLibrary", () => {
  it("keeps recommendation metadata for the add form", () => {
    const recommendation: SourceMediaRecord = {
      id: "",
      source: "open_library",
      externalId: "OL123W",
      title: "Recommended Book",
      type: "book",
      imageUrl: null,
      creators: ["Example Author"],
      genres: [
        "Science fiction",
        "Space opera",
        "Adventure",
        "Classics",
        "Politics",
        "Extra subject",
      ],
      numberOfPages: 320,
    };

    expect(hydrateOpenLibrary(recommendation)).toEqual({
      metadata: {
        genre: [
          "Science fiction",
          "Space opera",
          "Adventure",
          "Classics",
          "Politics",
        ],
        subjects: [
          "Science fiction",
          "Space opera",
          "Adventure",
          "Classics",
          "Politics",
          "Extra subject",
        ],
        numberOfPages: 320,
      },
    });
  });
});
