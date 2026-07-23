import { media, userMedia, userMediaStatusHistory } from "@media-voyage/shared";

export const userMediaSummarySelect = {
  id: userMedia.id,
  title: media.title,
  type: media.type,
  status: userMedia.status,
  progress: userMedia.progress,
  rating: userMedia.rating,
  favorite: userMedia.favorite,
  source: userMedia.source,
  lastProgressUpdate: userMedia.lastProgressUpdate,
  createdAt: userMedia.createdAt,
  updatedAt: userMedia.updatedAt,
};

export const userMediaDetailedSelect = {
  id: userMedia.id,
  mediaId: userMedia.mediaId,
  title: media.title,
  type: media.type,
  description: media.description,
  imageUrl: media.imageUrl,
  status: userMedia.status,
  rating: userMedia.rating,
  review: userMedia.review,
  notes: userMedia.notes,
  progress: userMedia.progress,
  favorite: userMedia.favorite,
  rewatches: userMedia.rewatches,
  timeSpent: userMedia.timeSpent,
  source: userMedia.source,
  tags: userMedia.tags,
  visibility: userMedia.visibility,
  customFields: userMedia.customFields,
  seasonsProgress: userMedia.seasonsProgress,
  startedAt: userMedia.startedAt,
  completedAt: userMedia.completedAt,
  lastProgressUpdate: userMedia.lastProgressUpdate,
  createdAt: userMedia.createdAt,
  updatedAt: userMedia.updatedAt,
};

export const userMediaCreatedSelect = {
  id: userMedia.id,
  mediaId: userMedia.mediaId,
  title: media.title,
  type: media.type,
  description: media.description,
  status: userMedia.status,
  rating: userMedia.rating,
  review: userMedia.review,
  notes: userMedia.notes,
  progress: userMedia.progress,
  favorite: userMedia.favorite,
  rewatches: userMedia.rewatches,
  timeSpent: userMedia.timeSpent,
  source: userMedia.source,
  tags: userMedia.tags,
  visibility: userMedia.visibility,
  customFields: userMedia.customFields,
  seasonsProgress: userMedia.seasonsProgress,
  lastProgressUpdate: userMedia.lastProgressUpdate,
  createdAt: userMedia.createdAt,
  updatedAt: userMedia.updatedAt,
};

export const mediaPickerSelect = {
  ...userMediaSummarySelect,
  imageUrl: media.imageUrl,
  tags: userMedia.tags,
};

export const statusHistorySelect = {
  id: userMediaStatusHistory.id,
  fromStatus: userMediaStatusHistory.fromStatus,
  toStatus: userMediaStatusHistory.toStatus,
  progressSnapshot: userMediaStatusHistory.progressSnapshot,
  source: userMediaStatusHistory.source,
  changedAt: userMediaStatusHistory.changedAt,
};

export const calendarStartedSelect = {
  id: userMedia.id,
  mediaId: userMedia.mediaId,
  title: media.title,
  type: media.type,
  status: userMedia.status,
  startedAt: userMedia.startedAt,
};

export const calendarCompletedSelect = {
  id: userMedia.id,
  mediaId: userMedia.mediaId,
  title: media.title,
  type: media.type,
  status: userMedia.status,
  completedAt: userMedia.completedAt,
};

export const calendarStatusChangeSelect = {
  userMediaId: userMediaStatusHistory.userMediaId,
  mediaId: userMedia.mediaId,
  title: media.title,
  type: media.type,
  status: userMedia.status,
  fromStatus: userMediaStatusHistory.fromStatus,
  toStatus: userMediaStatusHistory.toStatus,
  changedAt: userMediaStatusHistory.changedAt,
};

export const userMediaExportSelect = {
  id: userMedia.id,
  userId: userMedia.userId,
  mediaId: userMedia.mediaId,
  title: media.title,
  originalTitle: media.originalTitle,
  type: media.type,
  description: media.description,
  imageUrl: media.imageUrl,
  catalogSource: media.source,
  externalId: media.externalId,
  catalogMetadata: media.metadata,
  status: userMedia.status,
  rating: userMedia.rating,
  review: userMedia.review,
  notes: userMedia.notes,
  progress: userMedia.progress,
  favorite: userMedia.favorite,
  rewatches: userMedia.rewatches,
  timeSpent: userMedia.timeSpent,
  trackingSource: userMedia.source,
  tags: userMedia.tags,
  visibility: userMedia.visibility,
  customFields: userMedia.customFields,
  seasonsProgress: userMedia.seasonsProgress,
  startedAt: userMedia.startedAt,
  completedAt: userMedia.completedAt,
  lastProgressUpdate: userMedia.lastProgressUpdate,
  createdAt: userMedia.createdAt,
  updatedAt: userMedia.updatedAt,
};
