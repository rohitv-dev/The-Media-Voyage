import type { getUserMediaForExport } from "./queries";

type UserMediaExportRecords = Awaited<ReturnType<typeof getUserMediaForExport>>;

export function toCsvRows(records: UserMediaExportRecords) {
  return records.map((record) => ({
    id: record.id,
    mediaId: record.mediaId,
    title: record.title ?? "",
    type: record.type ?? "",
    description: record.description ?? "",
    imageUrl: record.imageUrl ?? "",
    catalogSource: record.catalogSource ?? "",
    externalId: record.externalId ?? "",
    catalogMetadata: JSON.stringify(record.catalogMetadata),
    status: record.status,
    rating: record.rating ?? "-",
    review: record.review ?? "-",
    notes: record.notes ?? "-",
    progress: `${record.progress}%`,
    favorite: record.favorite ? "true" : "false",
    timeSpent: record.timeSpent != null ? `${record.timeSpent} minutes` : "-",
    pagesRead: record.pagesRead ?? "-",
    trackingSource: record.trackingSource ?? "",
    tags: record.tags.join(", "),
    visibility: record.visibility,
    seasonsProgress: JSON.stringify(record.seasonsProgress),
    startedAt: record.startedAt
      ? record.startedAt.toISOString().slice(0, 16)
      : "-",
    completedAt: record.completedAt
      ? record.completedAt.toISOString().slice(0, 16)
      : "-",
    lastProgressUpdate: record.lastProgressUpdate.toISOString().slice(0, 16),
    createdAt: record.createdAt.toISOString().slice(0, 16),
    updatedAt: record.updatedAt.toISOString().slice(0, 16),
  }));
}
