export type TvMazeImage = {
  medium: string;
  original: string;
};

export type TvMazeRating = {
  average: number | null;
};

export type TvMazeExternalIds = {
  imdb: string | null;
};

export type TvMazeSearchResult = {
  score: number;
  show: TvMazeShow;
};

export type TvMazeShow = {
  id: number;
  name: string;
  genres: string[];
  image: TvMazeImage | null;
  rating: TvMazeRating;
  summary: string | null;
  runtime: number | null;
  averageRuntime: number | null;
  externals?: TvMazeExternalIds;

  _embedded?: {
    seasons: TvMazeSeason[];
  };
};

export type TvMazeSeason = {
  id: number;
  number: number;
  episodeOrder: number | null;
};

export type TvMazeDetails = Omit<TvMazeShow, "_embedded"> & {
  seasons: TvMazeSeason[];
};
