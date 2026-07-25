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
}

export interface OmdbShow extends OmdbMedia {
  Plot?: string;
  Genre?: string;
  Runtime?: string;
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
};

export const mediaResponseSchema = z.object({
  source: z.string(),
  id: mediaSelectSchema.shape.id,
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  externalId: mediaSelectSchema.shape.externalId,
  imageUrl: mediaSelectSchema.shape.imageUrl,
});

export type SourceMediaRecord = z.infer<typeof mediaResponseSchema>;
