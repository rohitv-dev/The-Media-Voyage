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

export interface OmdbRating {
  Source: string;
  Value: string;
}

export interface OmdbSearchResponse {
  Search: OmdbMedia[];
  totalResults: string;
  Response: string;
}

export interface OmdbErrorResponse {
  Response: "False";
  Error: string;
}

export type OmdbResponse = OmdbSearchResponse;

export type IgdbRecord = {
  id: number;
  name: string;
  cover: {
    id: number;
    image_id: string;
  };
  first_release_date?: number;
};

export type IgdbResponse = IgdbRecord[];

export const mediaResponseSchema = z.object({
  source: z.string(),
  id: mediaSelectSchema.shape.id,
  title: mediaSelectSchema.shape.title,
  type: mediaSelectSchema.shape.type,
  externalId: mediaSelectSchema.shape.externalId,
  imageUrl: mediaSelectSchema.shape.imageUrl,
  releaseDate: z.string(),
});

export type SourceMediaRecord = z.infer<typeof mediaResponseSchema>;
