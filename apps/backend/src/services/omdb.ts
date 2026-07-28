import {
  OmdbErrorResponse,
  OmdbMovie,
  OmdbResponse,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { env } from "../config";
import { internalServerError } from "../errors";

const API_KEY = env.OMDB_API_KEY;

// OMDb posters are Amazon-hosted images with a small default size baked into
// the URL (e.g. `..._SX300.jpg`), which looks pixelated in larger cards.
// Bumping the size parameter fetches a much higher resolution version.
const upscalePoster = (url: string): string =>
  url.replace(/SX\d+|SY\d+/, "SX800");

async function fetchOmdbSearch(
  query: string,
): Promise<OmdbResponse | OmdbErrorResponse> {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("s", query);
  url.searchParams.set("type", "movie");

  const response = await fetch(url);

  if (!response.ok) {
    throw internalServerError("OMDb request failed");
  }

  return response.json();
}

// OMDb's search endpoint is occasionally flaky, returning "Movie not
// found!" for a query that succeeds moments later on an identical retry.
// A single retry on an empty result works around this.
export async function searchOmdb(query: string): Promise<SourceMediaRecord[]> {
  let data = await fetchOmdbSearch(query);

  if (data.Response === "False") {
    data = await fetchOmdbSearch(query);
  }

  if (data.Response === "False") {
    return [];
  }

  const records: SourceMediaRecord[] = data.Search.map((val) => ({
    id: "",
    source: "omdb",
    title: val.Title,
    imageUrl: val.Poster === "N/A" ? val.Poster : upscalePoster(val.Poster),
    type: "movie",
    externalId: val.imdbID,
  }));

  return records;
}

export async function getOmdbDetails(
  externalId: string,
): Promise<OmdbMovie | null> {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("i", externalId);
  url.searchParams.set("type", "movie");

  const response = await fetch(url);

  if (!response.ok) {
    throw internalServerError("OMDb request failed");
  }

  const data: OmdbMovie & { Response?: string; Error?: string } =
    await response.json();

  if (data.Response === "False" || data.Type !== "movie") {
    return null;
  }

  return data;
}
