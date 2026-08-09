import type {
  TmdbMediaDetails,
  TmdbMediaRecord,
  TmdbMediaType,
} from "@media-voyage/shared/api";
import { z } from "zod";
import { env } from "../config";
import { internalServerError, notFound } from "../errors";

const TMDB_API_URL = "https://api.themoviedb.org/3/";
const TMDB_POSTER_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_LANGUAGE = "en-US";
const TMDB_NETWORK_RETRY_DELAY_MS = 200;

type TmdbMovieRecord = Extract<TmdbMediaRecord, { source: "tmdb_movie" }>;
type TmdbShowRecord = Extract<TmdbMediaRecord, { source: "tmdb_tv" }>;

const tmdbResultBaseSchema = z.object({
  id: z.number().int().positive(),
  adult: z.boolean().optional().default(false),
  poster_path: z.string().nullable().optional().default(null),
});

const tmdbMovieResultSchema = tmdbResultBaseSchema.extend({
  title: z.string(),
});

const tmdbShowResultSchema = tmdbResultBaseSchema.extend({
  name: z.string(),
});

const tmdbMovieResultsSchema = z.object({
  results: z.array(tmdbMovieResultSchema),
});

const tmdbShowResultsSchema = z.object({
  results: z.array(tmdbShowResultSchema),
});

const tmdbFindResultsSchema = z.object({
  movie_results: z.array(tmdbMovieResultSchema),
  tv_results: z.array(tmdbShowResultSchema),
});

const tmdbGenreSchema = z.object({
  name: z.string(),
});

const tmdbMovieDetailsSchema = tmdbMovieResultSchema.extend({
  overview: z.string().nullable().optional(),
  genres: z.array(tmdbGenreSchema),
  runtime: z.number().int().nonnegative().nullable().optional(),
  vote_average: z.number().min(0).max(10).nullable().optional(),
});

const tmdbShowDetailsSchema = tmdbShowResultSchema.extend({
  overview: z.string().nullable().optional(),
  genres: z.array(tmdbGenreSchema),
  episode_run_time: z.array(z.number().int().nonnegative()).optional(),
  vote_average: z.number().min(0).max(10).nullable().optional(),
});

function tmdbPath(type: TmdbMediaType): "movie" | "tv" {
  return type === "movie" ? "movie" : "tv";
}

function posterUrl(path: string | null): string | null {
  return path ? `${TMDB_POSTER_URL}${path}` : null;
}

function movieRecord(
  result: z.infer<typeof tmdbMovieResultSchema>,
): TmdbMovieRecord {
  return {
    id: "",
    source: "tmdb_movie",
    externalId: String(result.id),
    title: result.title,
    type: "movie",
    imageUrl: posterUrl(result.poster_path),
  };
}

function showRecord(
  result: z.infer<typeof tmdbShowResultSchema>,
): TmdbShowRecord {
  return {
    id: "",
    source: "tmdb_tv",
    externalId: String(result.id),
    title: result.name,
    type: "show",
    imageUrl: posterUrl(result.poster_path),
  };
}

function invalidResponse(cause: z.ZodError): never {
  throw internalServerError("TMDB returned an invalid response", { cause });
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestTmdb(url: URL): Promise<Response> {
  const options = {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${env.TMDB_API_READ_ACCESS_TOKEN}`,
    },
  };

  try {
    return await fetch(url, options);
  } catch {
    await delay(TMDB_NETWORK_RETRY_DELAY_MS);
  }

  try {
    return await fetch(url, options);
  } catch (error) {
    throw internalServerError("TMDB request failed", { cause: error });
  }
}

async function fetchTmdb(
  path: string,
  params: Record<string, string>,
  missingMessage?: string,
): Promise<unknown> {
  const url = new URL(path, TMDB_API_URL);

  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const response = await requestTmdb(url);

  if (response.status === 404 && missingMessage) {
    throw notFound(missingMessage);
  }

  if (!response.ok) {
    throw internalServerError("TMDB request failed");
  }

  try {
    return await response.json();
  } catch (error) {
    throw internalServerError("TMDB returned an invalid response", {
      cause: error,
    });
  }
}

function parseResults(type: TmdbMediaType, data: unknown): TmdbMediaRecord[] {
  if (type === "movie") {
    const parsed = tmdbMovieResultsSchema.safeParse(data);
    if (!parsed.success) return invalidResponse(parsed.error);

    return parsed.data.results
      .filter((result) => !result.adult)
      .map(movieRecord);
  }

  const parsed = tmdbShowResultsSchema.safeParse(data);
  if (!parsed.success) return invalidResponse(parsed.error);

  return parsed.data.results.filter((result) => !result.adult).map(showRecord);
}

export async function searchTmdb(
  query: string,
  type: TmdbMediaType,
): Promise<TmdbMediaRecord[]> {
  const data = await fetchTmdb(`search/${tmdbPath(type)}`, {
    query,
    include_adult: "false",
    language: TMDB_LANGUAGE,
    page: "1",
  });

  return parseResults(type, data);
}

export async function findTmdbByImdbId(
  imdbId: string,
  type: TmdbMediaType,
): Promise<TmdbMediaRecord | null> {
  const data = await fetchTmdb(`find/${encodeURIComponent(imdbId)}`, {
    external_source: "imdb_id",
    language: TMDB_LANGUAGE,
  });
  const parsed = tmdbFindResultsSchema.safeParse(data);
  if (!parsed.success) return invalidResponse(parsed.error);

  if (type === "movie") {
    const result = parsed.data.movie_results.find((item) => !item.adult);
    return result ? movieRecord(result) : null;
  }

  const result = parsed.data.tv_results.find((item) => !item.adult);
  return result ? showRecord(result) : null;
}

export async function getTmdbDetails(
  type: TmdbMediaType,
  id: number,
): Promise<TmdbMediaDetails> {
  const data = await fetchTmdb(
    `${tmdbPath(type)}/${id}`,
    { language: TMDB_LANGUAGE },
    "TMDB media not found",
  );

  if (type === "movie") {
    const parsed = tmdbMovieDetailsSchema.safeParse(data);
    if (!parsed.success) return invalidResponse(parsed.error);
    if (parsed.data.adult) throw notFound("TMDB media not found");

    return {
      ...movieRecord(parsed.data),
      description: parsed.data.overview?.trim() || null,
      genres: parsed.data.genres.map((genre) => genre.name),
      runtimeMinutes:
        parsed.data.runtime && parsed.data.runtime > 0
          ? parsed.data.runtime
          : null,
      catalogRating: parsed.data.vote_average ?? null,
    };
  }

  const parsed = tmdbShowDetailsSchema.safeParse(data);
  if (!parsed.success) return invalidResponse(parsed.error);
  if (parsed.data.adult) throw notFound("TMDB media not found");

  return {
    ...showRecord(parsed.data),
    description: parsed.data.overview?.trim() || null,
    genres: parsed.data.genres.map((genre) => genre.name),
    runtimeMinutes:
      parsed.data.episode_run_time?.find((runtime) => runtime > 0) ?? null,
    catalogRating: parsed.data.vote_average ?? null,
  };
}

export async function getTmdbRecommendations(
  type: TmdbMediaType,
  id: number,
): Promise<TmdbMediaRecord[]> {
  const data = await fetchTmdb(
    `${tmdbPath(type)}/${id}/recommendations`,
    {
      language: TMDB_LANGUAGE,
      page: "1",
    },
    "TMDB media not found",
  );

  return parseResults(type, data);
}
