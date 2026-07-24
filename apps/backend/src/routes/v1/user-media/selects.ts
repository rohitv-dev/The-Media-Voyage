import {
  media,
  sources,
  tags,
  userMedia,
  userMediaStatusHistory,
  userMediaTags,
} from "@media-voyage/shared";
import { sql } from "drizzle-orm";

const userMediaTagNames = sql<string[]>`(
  select coalesce(array_agg(${tags.name} order by ${tags.name}), '{}')
  from ${userMediaTags}
  inner join ${tags} on ${tags.id} = ${userMediaTags.tagId}
  where ${userMediaTags.userMediaId} = ${userMedia.id}
)`;

const userMediaSourceName = sql<string | null>`(
  select ${sources.name}
  from ${sources}
  where ${sources.id} = ${userMedia.sourceId}
)`;

export const userMediaSummarySelect = {
  id: userMedia.id,
  title: media.title,
  type: media.type,
  status: userMedia.status,
  progress: userMedia.progress,
  rating: userMedia.rating,
  favorite: userMedia.favorite,
  source: userMediaSourceName,
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
  catalogSource: media.source,
  status: userMedia.status,
  rating: userMedia.rating,
  review: userMedia.review,
  notes: userMedia.notes,
  progress: userMedia.progress,
  favorite: userMedia.favorite,
  rewatches: userMedia.rewatches,
  timeSpent: userMedia.timeSpent,
  source: userMediaSourceName,
  tags: userMediaTagNames,
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
  source: userMediaSourceName,
  tags: userMediaTagNames,
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
  tags: userMediaTagNames,
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
  trackingSource: userMediaSourceName,
  tags: userMediaTagNames,
  visibility: userMedia.visibility,
  customFields: userMedia.customFields,
  seasonsProgress: userMedia.seasonsProgress,
  startedAt: userMedia.startedAt,
  completedAt: userMedia.completedAt,
  lastProgressUpdate: userMedia.lastProgressUpdate,
  createdAt: userMedia.createdAt,
  updatedAt: userMedia.updatedAt,
};
