import type { UserMediaQuerySchema } from "@media-voyage/shared/api";

/**
 * Central registry of TanStack Query keys. Query options and cache
 * invalidations across features must reference these instead of writing out
 * array literals, so the two stay in sync — invalidating `userMedia.all`
 * needs to match exactly what `userMedia.detail`/`userMedia.filtered` etc.
 * were queried under (TanStack Query invalidates by prefix).
 */
export const queryKeys = {
  userMedia: {
    all: ["user-media"] as const,
    detail: (id: string) => ["user-media", { id }] as const,
    statusHistory: (id: string) => ["user-media-status-history", id] as const,
    filtered: (filters: UserMediaQuerySchema) =>
      ["user-media", filters] as const,
    trash: ["user-media", "trash"] as const,
    count: ["user-media", "count"] as const,
    dropdowns: ["user-media", "dropdowns"] as const,
  },
  dashboardStats: ["dashboard-stats"] as const,
  calendarActivity: (month: string) => ["calendar-activity", month] as const,
  mediaSearch: (type: string, search: string) =>
    ["media-search", type, search] as const,
  collection: {
    all: ["collection"] as const,
    items: (collectionId: string) =>
      ["collection-items", collectionId] as const,
    itemsAll: ["collection-items"] as const,
    itemsDetailed: (collectionId: string) =>
      ["collection-items-detailed", collectionId] as const,
    itemsDetailedAll: ["collection-items-detailed"] as const,
  },
  friends: {
    all: ["friends"] as const,
    requests: ["friends", "requests"] as const,
    feed: ["friends", "feed"] as const,
    mediaAll: ["friends", "media"] as const,
    media: (userId: string) => ["friends", "media", { userId }] as const,
    collections: (userId: string) =>
      ["friends", "collections", { userId }] as const,
    collection: (collectionId: string) =>
      ["friends", "collection", { collectionId }] as const,
    entry: (id: string) => ["friends", "entry", { id }] as const,
    comments: (id: string) =>
      ["friends", "entry", { id }, "comments"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (page: number, limit: number) =>
      ["notifications", { page, limit }] as const,
  },
} as const;
