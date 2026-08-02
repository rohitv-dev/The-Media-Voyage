export function formatDuration(totalMinutes: number) {
  const normalizedMinutes = Math.max(0, Math.trunc(totalMinutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}
