import {
  EMBEDDING_MODEL,
  media,
  mediaCollection,
  mediaCollectionItems,
  sources,
  tags,
  userMedia,
  userMediaStatusHistory,
  userMediaTags,
} from "@media-voyage/shared";
import type {
  CalendarActivityEvent,
  CalendarActivityQuery,
  MediaPickerQuery,
  UserMediaPageQuerySchema,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";
import { FUZZY_TITLE_SEARCH_CONFIG } from "@media-voyage/shared/api";
import type { Status } from "@media-voyage/shared/userMediaSchema";
import {
  and,
  asc,
  between,
  count,
  cosineDistance,
  desc,
  eq,
  gte,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db/db";
import { listReactions } from "../friends/queries";
import {
  calendarCompletedSelect,
  calendarStartedSelect,
  calendarStatusChangeSelect,
  mediaPickerSelect,
  statusHistorySelect,
  trashedUserMediaSelect,
  userMediaDetailedSelect,
  userMediaExportSelect,
  userMediaSummarySelect,
} from "./selects";

function userMediaIdsWithTags(userId: string, tagNames: string[]) {
  const normalizedNames = tagNames.map((name) => name.trim().toLowerCase());

  return db
    .select({ userMediaId: userMediaTags.userMediaId })
    .from(userMediaTags)
    .innerJoin(tags, eq(tags.id, userMediaTags.tagId))
    .where(
      and(
        eq(tags.userId, userId),
        inArray(tags.normalizedName, normalizedNames),
      ),
    );
}

function sourceIdsWithNames(userId: string, sourceNames: string[]) {
  const normalizedNames = sourceNames.map((name) => name.trim().toLowerCase());

  return db
    .select({ id: sources.id })
    .from(sources)
    .where(
      and(
        eq(sources.userId, userId),
        inArray(sources.normalizedName, normalizedNames),
      ),
    );
}

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

export function ownedDeletedUserMediaCondition(userId: string, id: string) {
  return and(
    eq(userMedia.id, id),
    eq(userMedia.userId, userId),
    isNotNull(userMedia.deletedAt),
  );
}

export async function findUserMediaById(userId: string, id: string) {
  const [record] = await db
    .select(userMediaDetailedSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(ownedUserMediaCondition(userId, id))
    .limit(1);

  if (!record) return null;

  const reactions = await listReactions(id);

  return { ...record, reactions };
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
  if (filters.source) {
    conditions.push(
      inArray(userMedia.sourceId, sourceIdsWithNames(userId, [filters.source])),
    );
  }
  if (filters.tag) {
    conditions.push(
      inArray(userMedia.id, userMediaIdsWithTags(userId, [filters.tag])),
    );
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

export function searchUserMedia(userId: string, search: string) {
  return db
    .select({
      id: userMedia.id,
      title: media.title,
      type: media.type,
    })
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(activeUserMediaCondition(userId), titleSearchCondition(search)))
    .orderBy(asc(media.title), asc(userMedia.id))
    .limit(20);
}

const HYBRID_SEARCH_CANDIDATE_LIMIT = 50;
const HYBRID_SEARCH_RESULT_LIMIT = 20;
const HYBRID_SEARCH_RRF_K = 60;
const MINIMUM_SEMANTIC_SIMILARITY = 0.35;

export function searchUserMediaHybrid(
  userId: string,
  query: string,
  embedding: number[],
) {
  const lexicalQuery = sql`websearch_to_tsquery('simple'::regconfig, ${query})`;
  const lexicalRelevance = sql<number>`ts_rank_cd(
    ${media.searchVector},
    ${lexicalQuery},
    32
  )`;
  const semanticSimilarity = sql<number>`1 - (${cosineDistance(
    media.embedding,
    embedding,
  )})`;

  const lexicalMatches = db
    .select({
      userMediaId: userMedia.id,
      lexicalRank: sql<number>`row_number() over (
        order by ${lexicalRelevance} desc, ${media.title} asc, ${userMedia.id} asc
      )`.as("lexical_rank"),
    })
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(
      and(
        activeUserMediaCondition(userId),
        sql`${media.searchVector} @@ ${lexicalQuery}`,
      ),
    )
    .orderBy(desc(lexicalRelevance), asc(media.title), asc(userMedia.id))
    .limit(HYBRID_SEARCH_CANDIDATE_LIMIT)
    .as("lexical_matches");

  const semanticMatches = db
    .select({
      userMediaId: userMedia.id,
      semanticRank: sql<number>`row_number() over (
        order by ${semanticSimilarity} desc, ${media.title} asc, ${userMedia.id} asc
      )`.as("semantic_rank"),
    })
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(
      and(
        activeUserMediaCondition(userId),
        isNotNull(media.embedding),
        eq(media.embeddingModel, EMBEDDING_MODEL),
        gt(semanticSimilarity, MINIMUM_SEMANTIC_SIMILARITY),
      ),
    )
    .orderBy(desc(semanticSimilarity), asc(media.title), asc(userMedia.id))
    .limit(HYBRID_SEARCH_CANDIDATE_LIMIT)
    .as("semantic_matches");

  const fuzzyTitleSimilarity = sql<number>`similarity(
    ${media.title},
    ${query}
  )`;
  const fuzzyTitleDistance = sql<number>`${media.title} <-> ${query}`;
  const fuzzyTitleCondition = sql`(
    ${media.title} % ${query}
    and ${fuzzyTitleSimilarity} > ${FUZZY_TITLE_SEARCH_CONFIG.minimumSimilarity}
  )`;

  const fuzzyTitleMatches = db
    .select({
      userMediaId: userMedia.id,
      fuzzyTitleRank: sql<number>`row_number() over (
        order by ${fuzzyTitleDistance} asc, ${media.title} asc, ${userMedia.id} asc
      )`.as("fuzzy_title_rank"),
    })
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(activeUserMediaCondition(userId), fuzzyTitleCondition))
    .orderBy(asc(fuzzyTitleDistance), asc(media.title), asc(userMedia.id))
    .limit(HYBRID_SEARCH_CANDIDATE_LIMIT)
    .as("fuzzy_title_matches");

  const fusedScore = sql<number>`
    coalesce(
      1.0 / (${HYBRID_SEARCH_RRF_K} + ${lexicalMatches.lexicalRank}),
      0
    ) +
    coalesce(
      1.0 / (${HYBRID_SEARCH_RRF_K} + ${semanticMatches.semanticRank}),
      0
    ) +
    coalesce(
      1.0 / (${HYBRID_SEARCH_RRF_K} + ${fuzzyTitleMatches.fuzzyTitleRank}),
      0
    )
  `;

  return db
    .select(userMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .leftJoin(lexicalMatches, eq(lexicalMatches.userMediaId, userMedia.id))
    .leftJoin(semanticMatches, eq(semanticMatches.userMediaId, userMedia.id))
    .leftJoin(
      fuzzyTitleMatches,
      eq(fuzzyTitleMatches.userMediaId, userMedia.id),
    )
    .where(
      and(
        activeUserMediaCondition(userId),
        or(
          isNotNull(lexicalMatches.userMediaId),
          isNotNull(semanticMatches.userMediaId),
          isNotNull(fuzzyTitleMatches.userMediaId),
        ),
      ),
    )
    .orderBy(desc(fusedScore), asc(media.title), asc(userMedia.id))
    .limit(HYBRID_SEARCH_RESULT_LIMIT);
}

function getUserMediaFilterConditions(
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
    conditions.push(titleSearchCondition(filters.search));
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
    conditions.push(
      inArray(userMedia.sourceId, sourceIdsWithNames(userId, filters.sources)),
    );
  }
  if (filters.tags?.length) {
    conditions.push(
      inArray(userMedia.id, userMediaIdsWithTags(userId, filters.tags)),
    );
  }

  return conditions;
}

function titleSearchCondition(search: string): SQL {
  const normalizedSearch = search.trim();
  const exactMatch = ilike(media.title, `%${search}%`);

  if (normalizedSearch.length < FUZZY_TITLE_SEARCH_CONFIG.minimumQueryLength) {
    return exactMatch;
  }

  const fuzzySimilarity = sql<number>`similarity(
    ${media.title},
    ${normalizedSearch}
  )`;

  return sql`(
    ${exactMatch}
    or (
      ${media.title} % ${normalizedSearch}
      and ${fuzzySimilarity} > ${FUZZY_TITLE_SEARCH_CONFIG.minimumSimilarity}
    )
  )`;
}

function getUserMediaFilterOrder(filters: UserMediaQuerySchema) {
  const sortColumns = {
    createdAt: userMedia.createdAt,
    updatedAt: userMedia.updatedAt,
    rating: userMedia.rating,
    title: media.title,
  };
  const sortDirection = filters.order === "asc" ? asc : desc;

  return [
    sortDirection(sortColumns[filters.sort]),
    sortDirection(userMedia.id),
  ] as const;
}

export async function filterUserMedia(
  userId: string,
  filters: UserMediaQuerySchema,
) {
  return db
    .select(userMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(...getUserMediaFilterConditions(userId, filters)))
    .orderBy(...getUserMediaFilterOrder(filters));
}

export async function filterUserMediaPage(
  userId: string,
  filters: UserMediaPageQuerySchema,
) {
  const records = await db
    .select(userMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(...getUserMediaFilterConditions(userId, filters)))
    .orderBy(...getUserMediaFilterOrder(filters))
    .limit(filters.limit + 1)
    .offset((filters.page - 1) * filters.limit);

  const hasNextPage = records.length > filters.limit;

  return {
    data: hasNextPage ? records.slice(0, filters.limit) : records,
    nextPage: hasNextPage ? filters.page + 1 : null,
  };
}

export function listUserMedia(userId: string) {
  return db
    .select(userMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(activeUserMediaCondition(userId))
    .orderBy(desc(userMedia.createdAt));
}

export function getUserMediaCounts(userId: string) {
  return db
    .select({ status: userMedia.status, count: count() })
    .from(userMedia)
    .where(activeUserMediaCondition(userId))
    .groupBy(userMedia.status);
}

export async function getUserMediaDropdowns(userId: string) {
  const [sourceRows, tagRows] = await Promise.all([
    db
      .select({ name: sources.name })
      .from(sources)
      .where(eq(sources.userId, userId))
      .orderBy(sources.name),
    db
      .select({ name: tags.name })
      .from(tags)
      .where(eq(tags.userId, userId))
      .orderBy(tags.name),
  ]);

  return {
    sources: sourceRows.map((row) => row.name),
    tags: tagRows.map((row) => row.name),
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
    timeSpentByType,
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
    db
      .select({
        type: media.type,
        minutes: sql<number>`coalesce(sum(${userMedia.timeSpent}), 0)::int`,
      })
      .from(userMedia)
      .innerJoin(media, eq(media.id, userMedia.mediaId))
      .where(
        and(activeUserMediaCondition(userId), isNotNull(userMedia.timeSpent)),
      )
      .groupBy(media.type)
      .orderBy(media.type),
  ]);

  const normalizedTimeSpentByType = timeSpentByType.map((row) => ({
    type: row.type,
    minutes: Number(row.minutes) || 0,
  }));

  const statusCounts = Object.fromEntries(
    statusDistribution.map((row) => [row.status, row.count]),
  ) as Partial<Record<Status, number>>;

  return {
    summary: {
      total_media: totalMedia[0]?.count ?? 0,
      completed: statusCounts.completed ?? 0,
      in_progress: statusCounts.in_progress ?? 0,
      playing: statusCounts.playing ?? 0,
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
    timeSpent: {
      totalMinutes: normalizedTimeSpentByType.reduce(
        (total, row) => total + row.minutes,
        0,
      ),
      byType: normalizedTimeSpentByType,
    },
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
            sql`${range.to}::date`,
          ),
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
            sql`${range.to}::date`,
          ),
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
            sql`${range.to}::date`,
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

export function listDeletedUserMedia(userId: string) {
  return db
    .select(trashedUserMediaSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(and(eq(userMedia.userId, userId), isNotNull(userMedia.deletedAt)))
    .orderBy(desc(userMedia.deletedAt));
}

export function getUserMediaForExport(userId: string) {
  return db
    .select(userMediaExportSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(activeUserMediaCondition(userId));
}
