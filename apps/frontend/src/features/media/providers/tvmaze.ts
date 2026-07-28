import type {
  SeasonProgressEntry,
  SourceMediaRecord,
  TvMazeDetails,
} from "@media-voyage/shared/api";
import { api } from "#/lib/api";
import type { HydratedMedia } from "./hydrateMedia";

function stripHtml(value: string) {
  const document = new DOMParser().parseFromString(value, "text/html");
  return document.body.textContent.trim() || undefined;
}

export async function hydrateTvMaze(
  record: SourceMediaRecord,
): Promise<HydratedMedia> {
  if (!record.externalId) return {};

  const details = await api<TvMazeDetails | null>(
    `/media/tvmaze/${encodeURIComponent(record.externalId)}`,
  );
  if (!details) return {};

  const metadata: Record<string, string> = {};
  const runtime = details.averageRuntime ?? details.runtime;

  if (details.genres.length > 0) {
    metadata.genre = details.genres.join(", ");
  }

  if (runtime !== null) {
    metadata.runtime = `${runtime} min`;
  }

  if (details.rating.average !== null) {
    metadata.catalogRating = `${details.rating.average}/10`;
  }

  const now = new Date().toISOString();
  const seasonsProgress: SeasonProgressEntry[] = details.seasons
    .filter((season) => season.number > 0)
    .map((season) => ({
      season: season.number,
      expectedEpisodeCount: season.episodeOrder,
      status: "planned",
      episodesWatched: 0,
      updatedAt: now,
    }));

  return {
    description: details.summary ? stripHtml(details.summary) : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    seasonsProgress,
  };
}
