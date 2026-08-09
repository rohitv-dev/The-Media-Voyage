import type {
  OpenLibrarySearchBook,
  OpenLibrarySearchResponse,
  OpenLibraryWork,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
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

const getOpenLibraryWorkId = (key: string): string =>
  key.replace(/^\/works\//, "");

export type OpenLibraryDetails = {
  description?: string;
  genres?: string[];
  numberOfPages?: number;
};

async function fetchOpenLibrarySearch(
  query: string,
): Promise<OpenLibrarySearchResponse> {
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

async function fetchOpenLibraryWork(
  externalId: string,
): Promise<OpenLibraryWork | null> {
  const url = new URL(
    `/works/${encodeURIComponent(externalId)}.json`,
    OPEN_LIBRARY_API_URL,
  );
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw internalServerError("Open Library work request failed");
  }

  return response.json() as Promise<OpenLibraryWork>;
}

function getWorkDescription(work: OpenLibraryWork | null): string | undefined {
  const description = work?.description;
  const value =
    typeof description === "string" ? description : description?.value;
  const trimmed = value?.trim();

  return trimmed || undefined;
}

async function findOpenLibraryBookByWorkId(
  externalId: string,
): Promise<OpenLibrarySearchBook | null> {
  const data = await fetchOpenLibrarySearch(`key:${externalId}`);

  return (
    data.docs.find((book) => getOpenLibraryWorkId(book.key) === externalId) ??
    null
  );
}

export async function searchOpenLibrary(
  query: string,
): Promise<SourceMediaRecord[]> {
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
    numberOfPages: book.number_of_pages_median,
  }));
}

export async function getOpenLibraryDetails(
  externalId: string,
): Promise<OpenLibraryDetails | null> {
  const [work, book] = await Promise.all([
    fetchOpenLibraryWork(externalId),
    findOpenLibraryBookByWorkId(externalId),
  ]);

  const genres = book?.subject ?? work?.subjects;
  const details: OpenLibraryDetails = {
    description: getWorkDescription(work),
    ...(genres?.length ? { genres } : {}),
    ...(book?.number_of_pages_median
      ? { numberOfPages: book.number_of_pages_median }
      : {}),
  };

  return Object.keys(details).length > 0 ? details : null;
}

export async function getOpenLibraryRecommendations(
  externalId: string,
): Promise<SourceMediaRecord[]> {
  const work = await fetchOpenLibraryWork(externalId);
  const subject = work?.subjects?.find((value) => value.trim());

  if (!subject) return [];

  const escapedSubject = subject.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const recommendations = await searchOpenLibrary(
    `subject:"${escapedSubject}"`,
  );

  return recommendations.filter((book) => book.externalId !== externalId);
}
