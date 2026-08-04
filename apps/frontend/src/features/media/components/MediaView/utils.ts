export const formatDate = (value?: Date | string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export const getProgress = (value?: number | null) =>
  Math.min(100, Math.max(0, value ?? 0));
