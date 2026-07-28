import type {
  SourceMediaRecord,
  TvMazeDetails,
  TvMazeSearchResult,
  TvMazeShow,
} from "@media-voyage/shared/api";
import { internalServerError } from "../errors";

const TVMAZE_API_URL = "https://api.tvmaze.com";

async function fetchTvMaze<T>(
  path: string,
  notFoundValue?: null,
): Promise<T | null> {
  const url = new URL(path, TVMAZE_API_URL);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404 && notFoundValue === null) {
    return null;
  }

  if (!response.ok) {
    throw internalServerError("TVMaze request failed");
  }

  return response.json() as Promise<T>;
}

export async function searchTvMaze(
  query: string,
): Promise<SourceMediaRecord[]> {
  const url = new URL("/search/shows", TVMAZE_API_URL);
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw internalServerError("TVMaze search failed");
  }

  const data = (await response.json()) as TvMazeSearchResult[];

  return data.map(({ show }) => ({
    id: "",
    source: "tvmaze",
    type: "show",
    externalId: String(show.id),
    title: show.name,
    imageUrl: show.image?.original ?? show.image?.medium ?? null,
  }));
}

export async function getTvMazeDetails(
  externalId: string,
): Promise<TvMazeDetails | null> {
  const show = await fetchTvMaze<TvMazeShow>(
    `/shows/${externalId}?embed[]=seasons`,
    null,
  );

  if (!show) return null;

  const { _embedded, ...showDetails } = show;

  return {
    ...showDetails,
    seasons: _embedded?.seasons ?? [],
  };
}
