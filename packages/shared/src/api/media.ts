import z from "zod";
import type { CatalogMetadata } from "../db/schema";
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

export const tmdbMediaParamsSchema = z.object({
  type: tmdbMediaTypeSchema,
  id: z.coerce.number().int().positive("TMDB ID must be a positive integer"),
});

export type TmdbMediaParams = z.infer<typeof tmdbMediaParamsSchema>;

export { DEFAULT_WATCH_COUNTRY } from "../db/schema";

export const WATCH_PROVIDER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const watchCountrySchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Watch country must be a two-letter country code");

export const tmdbWatchProvidersQuerySchema = z.object({
  country: watchCountrySchema,
});

export const watchOfferTypeValues = [
  "flatrate",
  "free",
  "ads",
  "rent",
  "buy",
] as const;

export type WatchOfferType = (typeof watchOfferTypeValues)[number];

export type TmdbWatchProvider = {
  id: number;
  name: string;
  logoUrl: string | null;
  displayPriority: number;
};

export type TmdbWatchAvailability = {
  country: string;
  link: string | null;
  offers: Record<WatchOfferType, TmdbWatchProvider[]>;
  expiresAt: string;
};

export type TmdbWatchRegion = {
  code: string;
  name: string;
};

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
  releaseDate?: string;
  summary?: string;
  genres?: { id: number; name: string }[];
  themes?: string[];
  keywords?: string[];
  gameModes?: string[];
  playerPerspectives?: string[];
  rating?: number;
};

export type OpenLibrarySearchResponse = {
  docs: OpenLibrarySearchBook[];
};

export type OpenLibrarySearchBook = {
  key: string;
  title: string;
  first_publish_year?: number;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
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
  releaseYear: z.number().int().nullable().optional(),

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

export type TmdbSeasonSummary = {
  seasonNumber: number;
  episodeCount: number;
};

export const providerCatalogSourceValues = [
  "tmdb_movie",
  "tmdb_tv",
  "igdb",
  "open_library",
] as const;

export const providerCatalogIdentitySchema = z.object({
  source: z.enum(providerCatalogSourceValues),
  externalId: z.string().trim().min(1, "External ID is required"),
});

export type ProviderCatalogIdentity = z.infer<
  typeof providerCatalogIdentitySchema
>;

export type ResolvedCatalogMedia = {
  id: string;
  title: string;
  type: SourceMediaRecord["type"];
  imageUrl: string | null;
  description: string | null;
  metadata: CatalogMetadata;
  source: ProviderCatalogIdentity["source"];
  externalId: string;
  seasons?: TmdbSeasonSummary[];
};

export interface TmdbMediaDetails extends SourceMediaRecord {
  source: TmdbMediaSource;
  externalId: string;
  type: TmdbMediaType;
  releaseDate?: string | null;
  description: string | null;
  genres: string[];
  keywords?: string[];
  runtimeMinutes: number | null;
  catalogRating: number | null;
  seasons: TmdbSeasonSummary[];
}
