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

export interface OmdbShow extends OmdbMedia {
  Plot?: string;
  Genre?: string;
  Runtime?: string;
  imdbRating?: string;
  totalSeasons?: string;
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

export const mediaResponseSchema = z.object({
  source: z.string(),
  id: mediaSelectSchema.shape.id,
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  externalId: mediaSelectSchema.shape.externalId,
  imageUrl: mediaSelectSchema.shape.imageUrl,

  creators: z.array(z.string()).optional(),
  genres: z.array(z.string()).optional(),
});

export type SourceMediaRecord = z.infer<typeof mediaResponseSchema>;
