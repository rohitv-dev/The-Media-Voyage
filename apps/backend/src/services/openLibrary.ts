import { OpenLibrarySearchResponse, SourceMediaRecord } from "@media-voyage/shared/api";
import { internalServerError } from "../errors";

const OPEN_LIBRARY_API_URL = "https://openlibrary.org";
const OPEN_LIBRARY_COVERS_URL = "https://covers.openlibrary.org";

const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_key",
  "author_name",
  "first_publish_year",
  "edition_count",
  "cover_i",
  "cover_edition_key",
  "number_of_pages_median",
  "isbn",
  "language",
  "publisher",
  "ratings_average",
  "ratings_count",
  "subject",
].join(",");

const getOpenLibraryCoverUrl = (coverId: number | undefined): string | null => {
  if (!coverId) {
    return null;
  }

  return `${OPEN_LIBRARY_COVERS_URL}/b/id/${coverId}-L.jpg`;
};

const getOpenLibraryWorkId = (key: string): string => key.replace(/^\/works\//, "");

async function fetchOpenLibrarySearch(query: string): Promise<OpenLibrarySearchResponse> {
  const url = new URL("/search.json", OPEN_LIBRARY_API_URL);

  url.searchParams.set("q", query);
  url.searchParams.set("fields", SEARCH_FIELDS);
  url.searchParams.set("limit", "20");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw internalServerError("Open Library request failed");
  }

  return response.json() as Promise<OpenLibrarySearchResponse>;
}

export async function searchOpenLibrary(query: string): Promise<SourceMediaRecord[]> {
  const data = await fetchOpenLibrarySearch(query);

  return data.docs.map((book) => ({
    id: "",
    source: "open_library",
    type: "book",
    externalId: getOpenLibraryWorkId(book.key),
    title: book.title,
    imageUrl: getOpenLibraryCoverUrl(book.cover_i),
    creators: book.author_name ?? [],
    genres: book.subject ?? [],
  }));
}
