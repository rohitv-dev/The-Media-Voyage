import { afterEach, describe, expect, it, vi } from "vitest";
import { getOpenLibraryDetails } from "./openLibrary";

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
