import z from "zod";
import { mediaSelectSchema } from "../schemas";
import { mediaTypeEnumValues } from "../schemas/userMediaSchema";

export const mediaSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Query parameter 'q' is required"),
  type: z.enum(mediaTypeEnumValues, {
    message: "Query parameter 'type' is required",
  }),
});

export type MediaSearchQuery = z.infer<typeof mediaSearchQuerySchema>;

export const tmdbMediaTypeSchema = z.enum(["movie", "show"]);

export type TmdbMediaType = z.infer<typeof tmdbMediaTypeSchema>;

export const tmdbSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Query parameter 'q' is required"),
  type: tmdbMediaTypeSchema,
});

export type TmdbSearchQuery = z.infer<typeof tmdbSearchQuerySchema>;

export const tmdbMediaParamsSchema = z.object({
  type: tmdbMediaTypeSchema,
  id: z.coerce.number().int().positive("TMDB ID must be a positive integer"),
});

export type TmdbMediaParams = z.infer<typeof tmdbMediaParamsSchema>;

export interface OmdbMedia {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export interface OmdbMovie extends OmdbMedia {
  Plot?: string;
  Genre?: string;
  Runtime?: string;
  imdbRating?: string;
}

export const mediaDetailsParamsSchema = z.object({
  id: z.string().trim().min(1, "ID parameter is required"),
});

export type MediaDetailsParams = z.infer<typeof mediaDetailsParamsSchema>;

export interface OmdbRating {
  Source: string;
  Value: string;
}

export interface OmdbSearchResponse {
  Search: OmdbMedia[];
  totalResults: string;
  Response: "True";
}

export interface OmdbErrorResponse {
  Response: "False";
  Error: string;
}

export type OmdbResponse = OmdbSearchResponse;

export type IgdbRecord = {
  id: number;
  name: string;
  cover?: {
    id: number;
    image_id: string;
  };
};

export type IgdbResponse = IgdbRecord[];

export type IgdbGame = {
  id: number;
  name: string;
  summary?: string;
  genres?: { id: number; name: string }[];
  rating?: number;
};

export type OpenLibrarySearchResponse = {
  numFound: number;
  start: number;
  numFoundExact?: boolean;
  docs: OpenLibrarySearchBook[];
};

export type OpenLibrarySearchBook = {
  key: string;
  title: string;
  subtitle?: string;

  author_key?: string[];
  author_name?: string[];

  first_publish_year?: number;
  edition_count?: number;

  cover_i?: number;
  cover_edition_key?: string;

  number_of_pages_median?: number;

  isbn?: string[];
  language?: string[];
  publisher?: string[];

  ratings_average?: number;
  ratings_count?: number;

  subject?: string[];
};

export type OpenLibraryWork = {
  description?: string | { value?: string };
  subjects?: string[];
};

export const mediaResponseSchema = z.object({
  source: z.string(),
  id: mediaSelectSchema.shape.id,
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  externalId: mediaSelectSchema.shape.externalId,
  imageUrl: mediaSelectSchema.shape.imageUrl,

  creators: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),

  numberOfPages: z.number().optional(),
});

export type SourceMediaRecord = z.infer<typeof mediaResponseSchema>;

export type TmdbMediaSource = "tmdb_movie" | "tmdb_tv";

export type TmdbMediaRecord =
  | (SourceMediaRecord & {
      source: "tmdb_movie";
      externalId: string;
      type: "movie";
    })
  | (SourceMediaRecord & {
      source: "tmdb_tv";
      externalId: string;
      type: "show";
    });

export interface TmdbMediaDetails extends SourceMediaRecord {
  source: TmdbMediaSource;
  type: TmdbMediaType;
  description: string | null;
  genres: string[];
  runtimeMinutes: number | null;
  catalogRating: number | null;
}
