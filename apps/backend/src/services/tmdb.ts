import type {
  TmdbMediaDetails,
  TmdbMediaRecord,
  TmdbMediaType,
} from "@media-voyage/shared/api";
import { normalizeCatalogTerms } from "@media-voyage/shared/catalogMetadata";
import { z } from "zod";
import { env } from "../config";
import { internalServerError, notFound } from "../errors";

const TMDB_API_URL = "https://api.themoviedb.org/3/";
const TMDB_POSTER_URL = "https://image.tmdb.org/t/p/w500";
const TMDB_LANGUAGE = "en-US";
const TMDB_NETWORK_RETRY_DELAY_MS = 200;
const TMDB_APPEND_LIMIT = 20;
const TMDB_TRENDING_LIMIT = 4;
const TMDB_TRENDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type TmdbMovieRecord = Extract<TmdbMediaRecord, { source: "tmdb_movie" }>;
type TmdbShowRecord = Extract<TmdbMediaRecord, { source: "tmdb_tv" }>;
type TmdbTrendingRecord<T extends TmdbMediaRecord> = {
  media: T;
  releaseYear: number | null;
  catalogRating: number | null;
};

type TmdbTrending = {
  movies: TmdbTrendingRecord<TmdbMovieRecord>[];
  shows: TmdbTrendingRecord<TmdbShowRecord>[];
};

let trendingCache: { value: TmdbTrending; expiresAt: number } | null = null;

const tmdbResultBaseSchema = z.object({
  id: z.number().int().positive(),
  adult: z.boolean().optional().default(false),
  poster_path: z.string().nullable().optional().default(null),
});

const tmdbMovieResultSchema = tmdbResultBaseSchema.extend({
  title: z.string(),
  release_date: z.string().nullable().optional().default(null),
  vote_average: z.number().min(0).max(10).nullable().optional().default(null),
});

const tmdbShowResultSchema = tmdbResultBaseSchema.extend({
  name: z.string(),
  first_air_date: z.string().nullable().optional().default(null),
  vote_average: z.number().min(0).max(10).nullable().optional().default(null),
});

const tmdbMovieResultsSchema = z.object({
  results: z.array(tmdbMovieResultSchema),
});

const tmdbShowResultsSchema = z.object({
  results: z.array(tmdbShowResultSchema),
});

const tmdbGenreSchema = z.object({
  name: z.string(),
});

const tmdbKeywordSchema = z.object({
  name: z.string(),
});

const tmdbKeywordResponseSchema = z.union([
  z.array(tmdbKeywordSchema),
  z.object({ keywords: z.array(tmdbKeywordSchema) }),
  z.object({ results: z.array(tmdbKeywordSchema) }),
]);

const tmdbMovieDetailsSchema = tmdbMovieResultSchema.extend({
  overview: z.string().nullable().optional(),
  genres: z.array(tmdbGenreSchema),
  keywords: tmdbKeywordResponseSchema.optional(),
  runtime: z.number().int().nonnegative().nullable().optional(),
});

const tmdbShowDetailsSchema = tmdbShowResultSchema.extend({
  overview: z.string().nullable().optional(),
  genres: z.array(tmdbGenreSchema),
  keywords: tmdbKeywordResponseSchema.optional(),
  episode_run_time: z.array(z.number().int().nonnegative()).optional(),
  last_episode_to_air: z
    .object({
      runtime: z.number().int().nonnegative().nullable().optional(),
    })
    .nullable()
    .optional(),
  seasons: z
    .array(
      z.object({
        season_number: z.number().int().nonnegative(),
        episode_count: z.number().int().nonnegative(),
      }),
    )
    .optional()
    .default([]),
});

const tmdbSeasonRuntimeSchema = z.object({
  episodes: z.array(
    z.object({
      runtime: z.number().nonnegative().nullable().optional(),
    }),
  ),
});

function tmdbPath(type: TmdbMediaType): "movie" | "tv" {
  return type === "movie" ? "movie" : "tv";
}

function posterUrl(path: string | null): string | null {
  return path ? `${TMDB_POSTER_URL}${path}` : null;
}

function releaseYear(date: string | null): number | null {
  const year = date?.slice(0, 4);
  return year && /^\d{4}$/.test(year) ? Number(year) : null;
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
    releaseYear: releaseYear(result.release_date),
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
    releaseYear: releaseYear(result.first_air_date),
  };
}

function invalidResponse(cause: z.ZodError): never {
  throw internalServerError("TMDB returned an invalid response", { cause });
}

function keywordNames(
  response: z.infer<typeof tmdbKeywordResponseSchema> | undefined,
) {
  if (!response) return undefined;

  const keywords = Array.isArray(response)
    ? response
    : "keywords" in response
      ? response.keywords
      : response.results;

  return normalizeCatalogTerms(keywords.map((keyword) => keyword.name));
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

function parseResults(type: "movie", data: unknown): TmdbMovieRecord[];
function parseResults(type: "show", data: unknown): TmdbShowRecord[];
function parseResults(type: TmdbMediaType, data: unknown): TmdbMediaRecord[];
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

function parseTrendingResults(
  type: "movie",
  data: unknown,
): TmdbTrendingRecord<TmdbMovieRecord>[];
function parseTrendingResults(
  type: "show",
  data: unknown,
): TmdbTrendingRecord<TmdbShowRecord>[];
function parseTrendingResults(
  type: TmdbMediaType,
  data: unknown,
): TmdbTrendingRecord<TmdbMediaRecord>[] {
  if (type === "movie") {
    const parsed = tmdbMovieResultsSchema.safeParse(data);
    if (!parsed.success) return invalidResponse(parsed.error);

    return parsed.data.results
      .filter((result) => !result.adult)
      .slice(0, TMDB_TRENDING_LIMIT)
      .map((result) => ({
        media: movieRecord(result),
        releaseYear: releaseYear(result.release_date),
        catalogRating: result.vote_average,
      }));
  }

  const parsed = tmdbShowResultsSchema.safeParse(data);
  if (!parsed.success) return invalidResponse(parsed.error);

  return parsed.data.results
    .filter((result) => !result.adult)
    .slice(0, TMDB_TRENDING_LIMIT)
    .map((result) => ({
      media: showRecord(result),
      releaseYear: releaseYear(result.first_air_date),
      catalogRating: result.vote_average,
    }));
}

async function getAverageEpisodeRuntime(
  showId: number,
  seasonNumbers: number[],
): Promise<number | null> {
  const batches = Array.from(
    { length: Math.ceil(seasonNumbers.length / TMDB_APPEND_LIMIT) },
    (_, index) =>
      seasonNumbers.slice(
        index * TMDB_APPEND_LIMIT,
        (index + 1) * TMDB_APPEND_LIMIT,
      ),
  );

  const responses = await Promise.all(
    batches.map((batch) =>
      fetchTmdb(`tv/${showId}`, {
        append_to_response: batch
          .map((seasonNumber) => `season/${seasonNumber}`)
          .join(","),
        language: TMDB_LANGUAGE,
      }),
    ),
  );

  const runtimes: number[] = [];

  responses.forEach((response, batchIndex) => {
    const record = z.record(z.string(), z.unknown()).safeParse(response);
    if (!record.success) return invalidResponse(record.error);

    for (const seasonNumber of batches[batchIndex]) {
      const season = tmdbSeasonRuntimeSchema.safeParse(
        record.data[`season/${seasonNumber}`],
      );
      if (!season.success) return invalidResponse(season.error);

      for (const episode of season.data.episodes) {
        if (episode.runtime && episode.runtime > 0) {
          runtimes.push(episode.runtime);
        }
      }
    }
  });

  if (!runtimes.length) return null;

  const average =
    runtimes.reduce((total, runtime) => total + runtime, 0) / runtimes.length;
  return Number(average.toFixed(1));
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

export async function getTmdbDetails(
  type: TmdbMediaType,
  id: number,
): Promise<TmdbMediaDetails> {
  const data = await fetchTmdb(
    `${tmdbPath(type)}/${id}`,
    { append_to_response: "keywords", language: TMDB_LANGUAGE },
    "TMDB media not found",
  );

  if (type === "movie") {
    const parsed = tmdbMovieDetailsSchema.safeParse(data);
    if (!parsed.success) return invalidResponse(parsed.error);
    if (parsed.data.adult) throw notFound("TMDB media not found");

    const keywords = keywordNames(parsed.data.keywords);

    return {
      ...movieRecord(parsed.data),
      description: parsed.data.overview?.trim() || null,
      genres: parsed.data.genres.map((genre) => genre.name),
      ...(keywords ? { keywords } : {}),
      runtimeMinutes:
        parsed.data.runtime && parsed.data.runtime > 0
          ? parsed.data.runtime
          : null,
      catalogRating: parsed.data.vote_average ?? null,
      seasons: [],
    };
  }

  const parsed = tmdbShowDetailsSchema.safeParse(data);
  if (!parsed.success) return invalidResponse(parsed.error);
  if (parsed.data.adult) throw notFound("TMDB media not found");

  const keywords = keywordNames(parsed.data.keywords);

  const seasons = parsed.data.seasons
    .filter((season) => season.season_number > 0 && season.episode_count > 0)
    .map((season) => ({
      seasonNumber: season.season_number,
      episodeCount: season.episode_count,
    }));
  let averageEpisodeRuntime: number | null = null;

  try {
    averageEpisodeRuntime = await getAverageEpisodeRuntime(
      id,
      seasons.map((season) => season.seasonNumber),
    );
  } catch {
    // Episode-level runtime is an optional enrichment. The main details
    // response still has usable show-level fallbacks when it is unavailable.
  }

  return {
    ...showRecord(parsed.data),
    description: parsed.data.overview?.trim() || null,
    genres: parsed.data.genres.map((genre) => genre.name),
    ...(keywords ? { keywords } : {}),
    runtimeMinutes:
      averageEpisodeRuntime ??
      parsed.data.episode_run_time?.find((runtime) => runtime > 0) ??
      (parsed.data.last_episode_to_air?.runtime || null),
    catalogRating: parsed.data.vote_average ?? null,
    seasons,
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

export async function getTmdbTrending(): Promise<TmdbTrending> {
  if (trendingCache && trendingCache.expiresAt > Date.now()) {
    return trendingCache.value;
  }

  const [movies, shows] = await Promise.all([
    fetchTmdb("trending/movie/week", { language: TMDB_LANGUAGE }),
    fetchTmdb("trending/tv/week", { language: TMDB_LANGUAGE }),
  ]);
  const value = {
    movies: parseTrendingResults("movie", movies),
    shows: parseTrendingResults("show", shows),
  };

  // ponytail: process-local cache; use a shared cache if multi-instance
  // duplicate TMDB requests become material.
  trendingCache = {
    value,
    expiresAt: Date.now() + TMDB_TRENDING_CACHE_TTL_MS,
  };

  return value;
}
