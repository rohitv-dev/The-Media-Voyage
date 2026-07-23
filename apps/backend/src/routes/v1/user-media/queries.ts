import {
  media,
  mediaCollection,
  mediaCollectionItems,
  userMedia,
  userMediaStatusHistory,
} from "@media-voyage/shared";
import type {
  CalendarActivityEvent,
  CalendarActivityQuery,
  MediaPickerQuery,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";
import type { Status } from "@media-voyage/shared/userMediaSchema";
import {
  and,
  arrayOverlaps,
  asc,
  between,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../../db/db";
import {
  calendarCompletedSelect,
  calendarStartedSelect,
  calendarStatusChangeSelect,
  mediaPickerSelect,
  statusHistorySelect,
  userMediaDetailedSelect,
  userMediaExportSelect,
  userMediaSummarySelect,
} from "./selects";

export function ownedUserMediaCondition(userId: string, id: string) {
  return and(
    eq(userMedia.id, id),
    eq(userMedia.userId, userId),
    isNull(userMedia.deletedAt),
  );
}

export function activeUserMediaCondition(userId: string) {
  return and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt));
}

export function ownedUserMediaIncludingDeletedCondition(
  userId: string,
  id: string,
) {
  return and(eq(userMedia.id, id), eq(userMedia.userId, userId));
}

export async function findUserMediaById(userId: string, id: string) {
  const [record] = await db
    .select(userMediaDetailedSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(ownedUserMediaCondition(userId, id))
    .limit(1);

  return record ?? null;
}

export async function getUserMediaStatusHistory(userId: string, id: string) {
  const [entry] = await db
    .select({ id: userMedia.id })
    .from(userMedia)
    .where(ownedUserMediaIncludingDeletedCondition(userId, id))
    .limit(1);

  if (!entry) return null;

  return db
    .select(statusHistorySelect)
    .from(userMediaStatusHistory)
    .innerJoin(userMedia, eq(userMediaStatusHistory.userMediaId, userMedia.id))
    .where(ownedUserMediaIncludingDeletedCondition(userId, id))
    .orderBy(desc(userMediaStatusHistory.changedAt));
}

export async function pickUserMedia(userId: string, filters: MediaPickerQuery) {
  const conditions: SQL[] = [
    eq(userMedia.userId, userId),
    eq(userMedia.status, "planned"),
    isNull(userMedia.deletedAt),
  ];

  if (filters.type) conditions.push(eq(media.type, filters.type));
  if (filters.source) conditions.push(eq(userMedia.source, filters.source));
  if (filters.tag) {
    conditions.push(arrayOverlaps(userMedia.tags, [filters.tag]));
  }

  if (filters.collectionId) {
    const [record] = await db
      .select(mediaPickerSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .innerJoin(
        mediaCollectionItems,
        and(
          eq(userMedia.id, mediaCollectionItems.userMediaId),
          eq(mediaCollectionItems.collectionId, filters.collectionId),
        ),
      )
      .innerJoin(
        mediaCollection,
        and(
          eq(mediaCollectionItems.collectionId, mediaCollection.id),
          eq(mediaCollection.userId, userId),
        ),
      )
      .where(and(...conditions))
      .orderBy(sql`random()`)
      .limit(1);

    return record ?? null;
  }

  const [record] = await db
    .select(mediaPickerSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(1);

  return record ?? null;
}

export async function filterUserMedia(
  userId: string,
  filters: UserMediaQuerySchema,
) {
  const conditions: SQL[] = [
    eq(userMedia.userId, userId),
    isNull(userMedia.deletedAt),
  ];

  if (filters.status?.length) {
    conditions.push(inArray(userMedia.status, filters.status));
  }
  if (filters.favorite !== undefined) {
    conditions.push(eq(userMedia.favorite, filters.favorite));
  }
  if (filters.type?.length) {
    conditions.push(inArray(media.type, filters.type));
  }
  if (filters.search) {
    conditions.push(ilike(media.title, `%${filters.search}%`));
  }
  if (filters.minRating !== undefined) {
    conditions.push(gte(userMedia.rating, filters.minRating));
  }
  if (filters.maxRating !== undefined) {
    conditions.push(lte(userMedia.rating, filters.maxRating));
  }
  if (filters.createdFrom) {
    conditions.push(
      sql`${userMedia.createdAt}::date >= ${filters.createdFrom}::date`,
    );
  }
  if (filters.createdTo) {
    conditions.push(
      sql`${userMedia.createdAt}::date <= ${filters.createdTo}::date`,
    );
  }
  if (filters.sources?.length) {
    conditions.push(inArray(userMedia.source, filters.sources));
  }
  if (filters.tags?.length) {
    conditions.push(arrayOverlaps(userMedia.tags, filters.tags));
  }

  const sortColumns = {
    createdAt: userMedia.createdAt,
    updatedAt: userMedia.updatedAt,
    rating: userMedia.rating,
    title: media.title,
  };
  const sortDirection = filters.order === "asc" ? asc : desc;

  return db
    .select(userMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(...conditions))
    .orderBy(sortDirection(sortColumns[filters.sort]));
}

export function listUserMedia(userId: string) {
  return db
    .select(userMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(eq(userMedia.userId, userId))
    .orderBy(desc(userMedia.createdAt));
}

export function getUserMediaCounts(userId: string) {
  return db
    .select({ status: userMedia.status, count: count() })
    .from(userMedia)
    .where(eq(userMedia.userId, userId))
    .groupBy(userMedia.status);
}

export async function getUserMediaDropdowns(userId: string) {
  const [sourceRows, tagRows] = await Promise.all([
    db
      .selectDistinct({ source: userMedia.source })
      .from(userMedia)
      .where(eq(userMedia.userId, userId)),
    db
      .select({ tags: userMedia.tags })
      .from(userMedia)
      .where(eq(userMedia.userId, userId)),
  ]);

  const tagsByNormalizedValue = new Map<string, string>();

  for (const tag of tagRows.flatMap((row) => row.tags ?? [])) {
    const trimmedTag = tag.trim();
    const normalizedTag = trimmedTag.toLowerCase();

    if (trimmedTag && !tagsByNormalizedValue.has(normalizedTag)) {
      tagsByNormalizedValue.set(normalizedTag, trimmedTag);
    }
  }

  return {
    sources: sourceRows
      .map((row) => row.source)
      .filter((source): source is string => source !== null),
    tags: [...tagsByNormalizedValue.values()].sort((a, b) =>
      a.localeCompare(b),
    ),
  };
}

export async function getDashboardStats(userId: string) {
  const [
    totalMedia,
    collections,
    statusDistribution,
    mediaTypeDistribution,
    ratingDistribution,
    completionTrend,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(userMedia)
      .where(activeUserMediaCondition(userId)),
    db
      .select({ count: count() })
      .from(mediaCollection)
      .where(eq(mediaCollection.userId, userId)),
    db
      .select({ status: userMedia.status, count: count() })
      .from(userMedia)
      .where(activeUserMediaCondition(userId))
      .groupBy(userMedia.status),
    db
      .select({ type: media.type, count: count() })
      .from(userMedia)
      .innerJoin(media, eq(media.id, userMedia.mediaId))
      .where(activeUserMediaCondition(userId))
      .groupBy(media.type),
    db
      .select({ rating: userMedia.rating, count: count() })
      .from(userMedia)
      .where(and(activeUserMediaCondition(userId), isNotNull(userMedia.rating)))
      .groupBy(userMedia.rating)
      .orderBy(userMedia.rating),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${userMedia.completedAt}), 'YYYY-MM')`,
        count: count(),
      })
      .from(userMedia)
      .where(
        and(
          activeUserMediaCondition(userId),
          eq(userMedia.status, "completed"),
          isNotNull(userMedia.completedAt),
        ),
      )
      .groupBy(sql`date_trunc('month', ${userMedia.completedAt})`)
      .orderBy(sql`date_trunc('month', ${userMedia.completedAt})`),
  ]);

  const statusCounts = Object.fromEntries(
    statusDistribution.map((row) => [row.status, row.count]),
  ) as Partial<Record<Status, number>>;

  return {
    summary: {
      total_media: totalMedia[0]?.count ?? 0,
      completed: statusCounts.completed ?? 0,
      in_progress: statusCounts.in_progress ?? 0,
      on_hold: statusCounts.on_hold ?? 0,
      planned: statusCounts.planned ?? 0,
      dropped: statusCounts.dropped ?? 0,
      revisiting: statusCounts.revisiting ?? 0,
      collections: collections[0]?.count ?? 0,
    },
    statusDistribution,
    mediaTypeDistribution,
    ratingDistribution,
    completionTrend,
  };
}

export async function getCalendarActivity(
  userId: string,
  range: CalendarActivityQuery,
) {
  const [started, completed, statusChanges] = await Promise.all([
    db
      .select(calendarStartedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(
        and(
          activeUserMediaCondition(userId),
          isNotNull(userMedia.startedAt),
          between(
            sql`${userMedia.startedAt}::date`,
            sql`${range.from}::date`,
            sql`${range.to}::date`
          )
        ),
      ),
    db
      .select(calendarCompletedSelect)
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(
        and(
          activeUserMediaCondition(userId),
          isNotNull(userMedia.completedAt),
          between(
            sql`${userMedia.completedAt}::date`,
            sql`${range.from}::date`,
            sql`${range.to}::date`
          )
        ),
      ),
    db
      .select(calendarStatusChangeSelect)
      .from(userMediaStatusHistory)
      .innerJoin(
        userMedia,
        eq(userMediaStatusHistory.userMediaId, userMedia.id),
      )
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(
        and(
          activeUserMediaCondition(userId),
          between(
            sql`${userMediaStatusHistory.changedAt}::date`,
            sql`${range.from}::date`,
            sql`${range.to}::date`
          ),
          notInArray(userMediaStatusHistory.toStatus, [
            "in_progress",
            "completed",
          ]),
        ),
      ),
  ]);

  const events: CalendarActivityEvent[] = [
    ...started.map((row) => ({
      date: row.startedAt!.toISOString().slice(0, 10),
      occurredAt: row.startedAt!.toISOString(),
      eventType: "started" as const,
      userMediaId: row.id,
      mediaId: row.mediaId,
      title: row.title,
      type: row.type,
      status: row.status,
      fromStatus: null,
      toStatus: null,
    })),
    ...completed.map((row) => ({
      date: row.completedAt!.toISOString().slice(0, 10),
      occurredAt: row.completedAt!.toISOString(),
      eventType: "completed" as const,
      userMediaId: row.id,
      mediaId: row.mediaId,
      title: row.title,
      type: row.type,
      status: row.status,
      fromStatus: null,
      toStatus: null,
    })),
    ...statusChanges.map((row) => ({
      date: row.changedAt.toISOString().slice(0, 10),
      occurredAt: row.changedAt.toISOString(),
      eventType: "status_change" as const,
      userMediaId: row.userMediaId,
      mediaId: row.mediaId,
      title: row.title,
      type: row.type,
      status: row.status,
      fromStatus: row.fromStatus,
      toStatus: row.toStatus,
    })),
  ];

  return { from: range.from, to: range.to, events };
}

export function getUserMediaForExport(userId: string) {
  return db
    .select(userMediaExportSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(eq(userMedia.userId, userId));
}
