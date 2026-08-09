type LibraryHistoryState = {
  libraryReturnDepth?: number;
};

export function getLibraryReturnDepth(state: unknown) {
  return (state as LibraryHistoryState).libraryReturnDepth;
}
