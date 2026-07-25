import {
  OmdbErrorResponse,
  OmdbMovie,
  OmdbResponse,
  OmdbShow,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { MediaType } from "@media-voyage/shared/userMediaSchema";
import { env } from "../config";
import { internalServerError } from "../errors";

const API_KEY = env.OMDB_API_KEY;

// OMDb posters are Amazon-hosted images with a small default size baked into
// the URL (e.g. `..._SX300.jpg`), which looks pixelated in larger cards.
// Bumping the size parameter fetches a much higher resolution version.
const upscalePoster = (url: string): string =>
  url.replace(/SX\d+|SY\d+/, "SX800");

const omdbTypeToMediaType = (type: string): MediaType => {
  if (type === "movie") return "movie";
  if (type === "series") return "show";
  return "movie";
};

export async function searchOmdb(query: string): Promise<SourceMediaRecord[]> {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("s", query);

  const response = await fetch(url);

  if (!response.ok) {
    throw internalServerError("OMDb request failed");
  }

  const data: OmdbResponse | OmdbErrorResponse = await response.json();

  if (data.Response === "False") {
    return [];
  }

  const records: SourceMediaRecord[] = data.Search.map((val) => ({
    id: "",
    source: "omdb",
    title: val.Title,
    imageUrl: val.Poster === "N/A" ? val.Poster : upscalePoster(val.Poster),
    type: omdbTypeToMediaType(val.Type),
    externalId: val.imdbID,
  }));

  return records;
}

export async function getOmdbDetails(
  externalId: string,
): Promise<OmdbMovie | OmdbShow | null> {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", API_KEY);
  url.searchParams.set("i", externalId);

  const response = await fetch(url);

  if (!response.ok) {
    throw internalServerError("OMDb request failed");
  }

  const data: (OmdbMovie | OmdbShow) & { Response?: string; Error?: string } =
    await response.json();

  if (data.Response === "False") {
    return null;
  }

  return data;
}

