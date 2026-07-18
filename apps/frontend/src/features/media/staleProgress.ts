export const STALE_PROGRESS_DAYS = 10;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getStaleProgressDays(
  lastProgressUpdate: Date | string | null | undefined,
  now = new Date(),
) {
  if (!lastProgressUpdate) return null;

  const updatedAt = new Date(lastProgressUpdate);
  if (Number.isNaN(updatedAt.getTime())) return null;

  const daysSinceUpdate = Math.floor(
    (now.getTime() - updatedAt.getTime()) / DAY_IN_MS,
  );

  return daysSinceUpdate >= STALE_PROGRESS_DAYS ? daysSinceUpdate : null;
}
