import type { CatalogMetadata } from "@media-voyage/shared";
import type {
  SeasonProgressEntry,
  TmdbMediaDetails,
} from "@media-voyage/shared/api";
import { api } from "#/lib/api";

type HydratedTmdbShow = {
  metadata?: CatalogMetadata<"show">;
  seasonsProgress: SeasonProgressEntry[];
};

export async function hydrateTmdbShow(
  externalId: string,
): Promise<HydratedTmdbShow> {
  const details = await api<TmdbMediaDetails>(
    `/media/tmdb/show/${encodeURIComponent(externalId)}`,
  );
  const metadata: CatalogMetadata<"show"> = {};

  if (details.genres.length) metadata.genre = details.genres;
  if (details.keywords?.length) metadata.keywords = details.keywords;
  if (details.runtimeMinutes) {
    metadata.runtime = details.runtimeMinutes;
  }
  if (details.catalogRating !== null) {
    metadata.catalogRating = details.catalogRating;
  }
  if (details.releaseDate) metadata.releaseDate = details.releaseDate;

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
    metadata: Object.keys(metadata).length ? metadata : undefined,
    seasonsProgress,
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
