import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getOpenLibraryDetails,
  getOpenLibraryRecommendations,
} from "./openLibrary";

const fetchMock = vi.fn();

describe("getOpenLibraryDetails", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("uses the stored work ID and ignores a non-matching search result", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ description: { value: "Work description" } }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            numFound: 1,
            start: 0,
            docs: [
              {
                key: "/works/OL999W",
                subject: ["Wrong work"],
                number_of_pages_median: 999,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOpenLibraryDetails("OL123W")).resolves.toEqual({
      description: "Work description",
    });

    expect(String(fetchMock.mock.calls[1][0])).toContain("q=key%3AOL123W");
  });

  it("returns metadata from the exact work search result", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 404 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            numFound: 1,
            start: 0,
            docs: [
              {
                key: "/works/OL123W",
                subject: ["Fantasy"],
                number_of_pages_median: 412,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOpenLibraryDetails("OL123W")).resolves.toEqual({
      genres: ["Fantasy"],
      numberOfPages: 412,
    });
  });
});

describe("getOpenLibraryRecommendations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("searches by the seed's first subject and excludes the seed", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ subjects: ["Fantasy", "Adventure"] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            numFound: 2,
            start: 0,
            docs: [
              { key: "/works/OL123W", title: "Seed" },
              {
                key: "/works/OL456W",
                title: "Similar Book",
                cover_i: 456,
              },
            ],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOpenLibraryRecommendations("OL123W")).resolves.toEqual([
      {
        id: "",
        source: "open_library",
        type: "book",
        externalId: "OL456W",
        title: "Similar Book",
        imageUrl: "https://covers.openlibrary.org/b/id/456-L.jpg",
        creators: [],
        genres: [],
        numberOfPages: undefined,
      },
    ]);

    const subjectSearchUrl = new URL(String(fetchMock.mock.calls[1][0]));
    expect(subjectSearchUrl.searchParams.get("q")).toBe('subject:"Fantasy"');
  });

  it("does not search for recommendations when the seed has no subjects", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ description: "Description" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getOpenLibraryRecommendations("OL123W")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
