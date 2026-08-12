import type {
  SeasonProgressEntry,
  SourceMediaRecord,
  TmdbMediaDetails,
} from "@media-voyage/shared/api";
import { api } from "#/lib/api";
import type { CatalogMetadata } from "../catalogMetadata";

type HydratedTmdb = {
  description?: string;
  metadata?: CatalogMetadata;
  seasonsProgress?: SeasonProgressEntry[];
};

export async function hydrateTmdb(
  record: SourceMediaRecord,
): Promise<HydratedTmdb> {
  if (
    !record.externalId ||
    (record.type !== "movie" && record.type !== "show")
  ) {
    return {};
  }

  const details = await api<TmdbMediaDetails>(
    `/media/tmdb/${record.type}/${encodeURIComponent(record.externalId)}`,
  );
  const metadata: CatalogMetadata<"movie" | "show"> = {};

  if (details.genres.length) metadata.genre = details.genres;
  if (details.keywords?.length) metadata.keywords = details.keywords;
  if (details.runtimeMinutes) {
    metadata.runtime = details.runtimeMinutes;
  }
  if (details.catalogRating !== null) {
    metadata.catalogRating = details.catalogRating;
  }

  const now = new Date().toISOString();
  const seasonsProgress: SeasonProgressEntry[] = details.seasons.map(
    (season) => ({
      season: season.seasonNumber,
      expectedEpisodeCount: season.episodeCount,
      status: "planned",
      episodesWatched: 0,
      updatedAt: now,
    }),
  );

  return {
    description: details.description ?? undefined,
    metadata: Object.keys(metadata).length ? metadata : undefined,
    ...(record.type === "show" ? { seasonsProgress } : {}),
  };
}

export function mergeTmdbSeasons(
  existing: SeasonProgressEntry[],
  incoming: SeasonProgressEntry[],
): SeasonProgressEntry[] {
  const incomingBySeason = new Map(
    incoming.map((season) => [season.season, season]),
  );
  const existingSeasonNumbers = new Set(
    existing.map((season) => season.season),
  );

  const merged = existing.map((season) => {
    const synced = incomingBySeason.get(season.season);
    if (!synced) return season;

    const episodeCount = Math.max(
      synced.expectedEpisodeCount ?? 0,
      season.episodesWatched ?? 0,
    );

    if (season.expectedEpisodeCount === episodeCount) return season;

    return {
      ...season,
      expectedEpisodeCount: episodeCount,
      updatedAt: new Date().toISOString(),
    };
  });

  return [
    ...merged,
    ...incoming.filter((season) => !existingSeasonNumbers.has(season.season)),
  ];
}
