import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../../auth";
import {
  media,
  mediaCollection,
  mediaCollectionItems,
  userMedia,
  userMediaStatusHistory,
} from "@media-voyage/shared";
import {
  eq,
  ilike,
  and,
  desc,
  count,
  sql,
  isNotNull,
  inArray,
  arrayOverlaps,
  asc,
  gte,
  lte,
  isNull,
} from "drizzle-orm";
import {
  userMediaFormSchema,
  mediaPickerQuerySchema,
  userMediaQuickActionSchema,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { db } from "../../db/db";
import Papa from "papaparse";
import { Status } from "@media-voyage/shared/userMediaSchema";

async function userMediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      request.userId = session.user.id;
    } catch (error) {
      console.error("Authentication error in preHandler:", error);
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.post("/", async (request, reply) => {
    const userId = request.userId;

    const parsed = userMediaFormSchema.parse(request.body);

    const { title, type, externalId, imageUrl, releaseDate, mediaSource } = parsed;

    const record = await db.transaction(async (tx) => {
      let mediaId = parsed.mediaId;

      if (!mediaId) {
        const [createdMedia] = await tx
          .insert(media)
          .values({
            title,
            type,
            externalId,
            imageUrl,
            releaseDate,
            source: mediaSource,
          })
          .returning({ id: media.id });

        mediaId = createdMedia.id;
      }

      const statusChangedAt = new Date();
      const [createdUserMedia] = await tx
        .insert(userMedia)
        .values({
          userId,
          mediaId,
          status: parsed.status,
          statusChangedAt,
          rating: parsed.rating,
          review: parsed.review,
          notes: parsed.notes,
          startedAt: parsed.startedAt,
          completedAt: parsed.completedAt,
          progress: parsed.progress,
          favorite: parsed.favorite,
          rewatches: parsed.rewatches,
          timeSpent: parsed.timeSpent,
          source: parsed.source,
          tags: parsed.tags,
          visibility: parsed.visibility,
          customFields: parsed.customFields,
          seasonsProgress: parsed.seasonsProgress,
        })
        .returning({
          id: userMedia.id,
          status: userMedia.status,
          progress: userMedia.progress,
        });

      await tx.insert(userMediaStatusHistory).values({
        userMediaId: createdUserMedia.id,
        fromStatus: null,
        toStatus: createdUserMedia.status,
        progressSnapshot: createdUserMedia.progress,
        source: "created",
        changedAt: statusChangedAt,
      });

      const [record] = await tx
        .select({
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
        })
        .from(userMedia)
        .innerJoin(media, eq(userMedia.mediaId, media.id))
        .where(eq(userMedia.id, createdUserMedia.id))
        .limit(1);

      return record;
    });

    return reply.status(201).send(record);
  });

  fastify.get("/:id", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    const userMediaRecord = await db
      .select({
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
      })
      .from(userMedia)
      .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .limit(1);

    if (!userMediaRecord.length) {
      return reply.status(404).send({ error: "User media not found" });
    }

    return reply.send(userMediaRecord[0]);
  });

  fastify.patch("/:id", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };
    console.log(request.body);
    const updateData = userMediaFormSchema.parse(request.body);

    const { title, type, mediaId, ...rest } = updateData;

    const userMediaRecord = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          progress: userMedia.progress,
          status: userMedia.status,
          statusChangedAt: userMedia.statusChangedAt,
          lastProgressUpdate: userMedia.lastProgressUpdate,
        })
        .from(userMedia)
        .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
        .for("update")
        .limit(1);

      if (!existing) return null;

      const progressChanged =
        rest.progress !== undefined && rest.progress !== existing.progress;
      const startedProgress =
        rest.status === "in_progress" && existing.status !== "in_progress";
      const statusChanged =
        rest.status !== undefined && rest.status !== existing.status;
      const now = new Date();

      const [updated] = await tx
        .update(userMedia)
        .set({
          ...rest,
          statusChangedAt: statusChanged ? now : existing.statusChangedAt,
          lastProgressUpdate:
            progressChanged || startedProgress
              ? now
              : existing.lastProgressUpdate,
        })
        .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
        .returning({
          id: userMedia.id,
          status: userMedia.status,
          progress: userMedia.progress,
        });

      if (!updated) return null;

      if (statusChanged) {
        await tx.insert(userMediaStatusHistory).values({
          userMediaId: updated.id,
          fromStatus: existing.status,
          toStatus: updated.status,
          progressSnapshot: updated.progress,
          source: "form",
          changedAt: now,
        });
      }

      const [record] = await tx
        .select({
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

          startedAt: userMedia.startedAt,
          completedAt: userMedia.completedAt,
          lastProgressUpdate: userMedia.lastProgressUpdate,
          createdAt: userMedia.createdAt,
          updatedAt: userMedia.updatedAt,
        })
        .from(userMedia)
        .where(and(eq(userMedia.id, updated.id), eq(userMedia.userId, userId)))
        .innerJoin(media, eq(userMedia.mediaId, media.id))
        .limit(1);

      return record ?? null;
    });

    if (!userMediaRecord) {
      return reply.status(404).send({ error: "User media not found or not updated" });
    }

    return reply.send(userMediaRecord);
  });

  fastify.patch("/:id/quick-actions", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };
    const quickAction = userMediaQuickActionSchema.parse(request.body);
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          status: userMedia.status,
          progress: userMedia.progress,
        })
        .from(userMedia)
        .where(
          and(
            eq(userMedia.id, id),
            eq(userMedia.userId, userId),
            isNull(userMedia.deletedAt),
          ),
        )
        .for("update")
        .limit(1);

      if (!existing) return null;

      const now = new Date();
      const statusChanged =
        quickAction.status !== undefined &&
        quickAction.status !== existing.status;
      const updateData: Partial<typeof userMedia.$inferInsert> = {
        ...quickAction,
        updatedAt: now,
      };

      if (
        quickAction.progress !== undefined ||
        (statusChanged && quickAction.status === "in_progress")
      ) {
        updateData.lastProgressUpdate = now;
      }

      if (statusChanged) {
        updateData.statusChangedAt = now;

        if (quickAction.status === "completed") {
          updateData.completedAt = now;
          updateData.progress = 100;
          updateData.lastProgressUpdate = now;
        } else {
          updateData.completedAt = null;
        }
      }

      const [updated] = await tx
        .update(userMedia)
        .set(updateData)
        .where(
          and(
            eq(userMedia.id, id),
            eq(userMedia.userId, userId),
            isNull(userMedia.deletedAt),
          ),
        )
        .returning({
          id: userMedia.id,
          status: userMedia.status,
          progress: userMedia.progress,
          rating: userMedia.rating,
          favorite: userMedia.favorite,
          source: userMedia.source,
          lastProgressUpdate: userMedia.lastProgressUpdate,
          createdAt: userMedia.createdAt,
          updatedAt: userMedia.updatedAt,
        });

      if (!updated) return null;

      if (statusChanged) {
        await tx.insert(userMediaStatusHistory).values({
          userMediaId: updated.id,
          fromStatus: existing.status,
          toStatus: updated.status,
          progressSnapshot: updated.progress,
          source: "quick_action",
          changedAt: now,
        });
      }

      const [catalogRecord] = await tx
        .select({ title: media.title, type: media.type })
        .from(userMedia)
        .innerJoin(media, eq(userMedia.mediaId, media.id))
        .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
        .limit(1);

      return { ...updated, ...catalogRecord };
    });

    if (!result) {
      return reply.status(404).send({ error: "User media not found" });
    }

    return reply.send(result);
  });

  fastify.get("/:id/status-history", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

    const [entry] = await db
      .select({ id: userMedia.id })
      .from(userMedia)
      .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
      .limit(1);

    if (!entry) {
      return reply.status(404).send({ error: "User media not found" });
    }

    const history = await db
      .select({
        id: userMediaStatusHistory.id,
        fromStatus: userMediaStatusHistory.fromStatus,
        toStatus: userMediaStatusHistory.toStatus,
        progressSnapshot: userMediaStatusHistory.progressSnapshot,
        source: userMediaStatusHistory.source,
        changedAt: userMediaStatusHistory.changedAt,
      })
      .from(userMediaStatusHistory)
      .innerJoin(userMedia, eq(userMediaStatusHistory.userMediaId, userMedia.id))
      .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
      .orderBy(desc(userMediaStatusHistory.changedAt));

    return reply.send(history);
  });

  fastify.get("/pick", async (request, reply) => {
    const userId = request.userId;
    const filters = mediaPickerQuerySchema.parse(request.query);
    const conditions = [eq(userMedia.userId, userId), eq(userMedia.status, "planned"), isNull(userMedia.deletedAt)];

    if (filters.type) conditions.push(eq(media.type, filters.type));
    if (filters.source) conditions.push(eq(userMedia.source, filters.source));
    if (filters.tag) conditions.push(arrayOverlaps(userMedia.tags, [filters.tag]));

    const selection = {
      id: userMedia.id,
      title: media.title,
      type: media.type,
      imageUrl: media.imageUrl,
      status: userMedia.status,
      progress: userMedia.progress,
      rating: userMedia.rating,
      favorite: userMedia.favorite,
      source: userMedia.source,
      tags: userMedia.tags,
      lastProgressUpdate: userMedia.lastProgressUpdate,
      createdAt: userMedia.createdAt,
      updatedAt: userMedia.updatedAt,
    };

    const records = filters.collectionId
      ? await db
          .select(selection)
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
            and(eq(mediaCollectionItems.collectionId, mediaCollection.id), eq(mediaCollection.userId, userId)),
          )
          .where(and(...conditions))
          .orderBy(sql`random()`)
          .limit(1)
      : await db
          .select(selection)
          .from(userMedia)
          .innerJoin(media, eq(userMedia.mediaId, media.id))
          .where(and(...conditions))
          .orderBy(sql`random()`)
          .limit(1);

    return reply.send(records[0] ?? null);
  });

  fastify.get<{ Querystring: UserMediaQuerySchema }>("/filter", async (request, reply) => {
    const userId = request.userId;
    const parsed = userMediaQuerySchema.parse(request.query);

    const conditions = [eq(userMedia.userId, userId), isNull(userMedia.deletedAt)];

    if (parsed.status && parsed.status.length > 0) {
      conditions.push(inArray(userMedia.status, parsed.status));
    }

    if (parsed.favorite !== undefined) {
      conditions.push(eq(userMedia.favorite, parsed.favorite));
    }

    if (parsed.type && parsed.type.length > 0) {
      conditions.push(inArray(media.type, parsed.type));
    }

    if (parsed.search) {
      conditions.push(ilike(media.title, `%${parsed.search}%`));
    }

    if (parsed.minRating !== undefined) {
      conditions.push(gte(userMedia.rating, parsed.minRating));
    }

    if (parsed.maxRating !== undefined) {
      conditions.push(lte(userMedia.rating, parsed.maxRating));
    }

    if (parsed.createdFrom) {
      conditions.push(sql`${userMedia.createdAt}::date >= ${parsed.createdFrom}::date`);
    }

    if (parsed.createdTo) {
      conditions.push(sql`${userMedia.createdAt}::date <= ${parsed.createdTo}::date`);
    }

    if (parsed.sources && parsed.sources.length > 0) {
      conditions.push(inArray(userMedia.source, parsed.sources));
    }

    if (parsed.tags && parsed.tags.length > 0) {
      conditions.push(arrayOverlaps(userMedia.tags, parsed.tags));
    }

    const sortColumns = {
      createdAt: userMedia.createdAt,
      updatedAt: userMedia.updatedAt,
      rating: userMedia.rating,
      title: media.title,
    };
    const sortDirection = parsed.order === "asc" ? asc : desc;

    const results = await db
      .select({
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
      })
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(and(...conditions))
      .orderBy(sortDirection(sortColumns[parsed.sort]));

    return reply.send({
      success: true,
      count: results.length,
      data: results,
    });
  });

  fastify.get("/", async (request, reply) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const userId = session.user.id;

    const results = await db
      .select({
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
      })
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(eq(userMedia.userId, userId))
      .orderBy(desc(userMedia.createdAt));

    return reply.send({
      success: true,
      count: results.length,
      data: results,
    });
  });

  fastify.get("/favorites", async (request, reply) => {
    const userId = request.userId;

    const results = await db
      .select({
        id: userMedia.id,
        mediaId: userMedia.mediaId,
        title: media.title,
        type: media.type,
        status: userMedia.status,
        rating: userMedia.rating,
        favorite: userMedia.favorite,
        review: userMedia.review,
        notes: userMedia.notes,
        progress: userMedia.progress,
        timeSpent: userMedia.timeSpent,

        createdAt: userMedia.createdAt,
        updatedAt: userMedia.updatedAt,
      })
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(and(eq(userMedia.userId, userId), eq(userMedia.favorite, true)))
      .orderBy(desc(userMedia.rating));

    return reply.send({
      success: true,
      count: results.length,
      data: results,
    });
  });

  fastify.get("/counts", async (request, reply) => {
    const userId = request.userId;

    const counts = await db
      .select({
        status: userMedia.status,
        count: count(),
      })
      .from(userMedia)
      .where(eq(userMedia.userId, userId))
      .groupBy(userMedia.status);

    return reply.send(counts);
  });

  fastify.get("/dropdowns", async (request, reply) => {
    const userId = request.userId;

    const [sourceRows, tagRows] = await Promise.all([
      db.selectDistinct({ source: userMedia.source }).from(userMedia).where(eq(userMedia.userId, userId)),
      db.select({ tags: userMedia.tags }).from(userMedia).where(eq(userMedia.userId, userId)),
    ]);

    const tagsByNormalizedValue = new Map<string, string>();

    for (const tag of tagRows.flatMap((row) => row.tags ?? [])) {
      const trimmedTag = tag.trim();
      const normalizedTag = trimmedTag.toLowerCase();

      if (trimmedTag && !tagsByNormalizedValue.has(normalizedTag)) {
        tagsByNormalizedValue.set(normalizedTag, trimmedTag);
      }
    }

    return reply.send({
      sources: sourceRows.map((row) => row.source).filter((source) => source !== null),
      tags: [...tagsByNormalizedValue.values()].sort((a, b) => a.localeCompare(b)),
    });
  });

  fastify.get("/dashboard/stats", async (request, reply) => {
    const userId = request.userId;

    function statusSelect(status: Status) {
      return db
        .select({ count: count() })
        .from(userMedia)
        .where(and(eq(userMedia.userId, userId), eq(userMedia.status, status), isNull(userMedia.deletedAt)));
    }

    const [
      totalMedia,
      completed,
      inProgress,
      planned,
      dropped,
      onHold,
      collections,
      statusDistribution,
      mediaTypeDistribution,
      ratingDistribution,
      completionTrend,
    ] = await Promise.all([
      //-----------------------------------
      // Summary
      //-----------------------------------

      db
        .select({ count: count() })
        .from(userMedia)
        .where(and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt))),

      statusSelect("completed"),
      statusSelect("in_progress"),
      statusSelect("planned"),
      statusSelect("dropped"),
      statusSelect("on_hold"),

      db.select({ count: count() }).from(mediaCollection).where(eq(mediaCollection.userId, userId)),

      //-----------------------------------
      // Status chart
      //-----------------------------------

      db
        .select({
          status: userMedia.status,
          count: count(),
        })
        .from(userMedia)
        .where(and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt)))
        .groupBy(userMedia.status),

      //-----------------------------------
      // Media type chart
      //-----------------------------------

      db
        .select({
          type: media.type,
          count: count(),
        })
        .from(userMedia)
        .innerJoin(media, eq(media.id, userMedia.mediaId))
        .where(and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt)))
        .groupBy(media.type),

      //-----------------------------------
      // Rating distribution
      //-----------------------------------

      db
        .select({
          rating: userMedia.rating,
          count: count(),
        })
        .from(userMedia)
        .where(and(eq(userMedia.userId, userId), isNull(userMedia.deletedAt), isNotNull(userMedia.rating)))
        .groupBy(userMedia.rating)
        .orderBy(userMedia.rating),

      //-----------------------------------
      // Completed per month
      //-----------------------------------

      db
        .select({
          month: sql<string>`
              to_char(date_trunc('month', ${userMedia.completedAt}), 'YYYY-MM')
            `,
          count: count(),
        })
        .from(userMedia)
        .where(
          and(
            eq(userMedia.userId, userId),
            eq(userMedia.status, "completed"),
            isNotNull(userMedia.completedAt),
            isNull(userMedia.deletedAt),
          ),
        )
        .groupBy(sql`date_trunc('month', ${userMedia.completedAt})`)
        .orderBy(sql`date_trunc('month', ${userMedia.completedAt})`),
    ]);

    return {
      summary: {
        total_media: totalMedia[0]?.count ?? 0,
        completed: completed[0]?.count ?? 0,
        in_progress: inProgress[0]?.count ?? 0,
        on_hold: onHold[0]?.count ?? 0,
        planned: planned[0]?.count ?? 0,
        dropped: dropped[0]?.count ?? 0,
        collections: collections[0]?.count ?? 0,
      },

      statusDistribution,

      mediaTypeDistribution,

      ratingDistribution,

      completionTrend,
    };
  });

  fastify.get("/export", async (request, reply) => {
    const userId = request.userId;

    try {
      // Fetch all user media with joined catalog data
      const records = await db
        .select({
          id: userMedia.id,
          userId: userMedia.userId,
          mediaId: userMedia.mediaId,
          title: media.title,
          originalTitle: media.originalTitle,
          type: media.type,
          description: media.description,
          imageUrl: media.imageUrl,
          releaseDate: media.releaseDate,
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
        })
        .from(userMedia)
        .innerJoin(media, eq(userMedia.mediaId, media.id))
        .where(eq(userMedia.userId, userId));

      // Convert to plain objects for CSV
      const csvData = records.map((r) => ({
        id: r.id,
        mediaId: r.mediaId,
        title: r.title ?? "",
        originalTitle: r.originalTitle ?? "",
        type: r.type ?? "",
        description: r.description ?? "",
        imageUrl: r.imageUrl ?? "",
        releaseDate: r.releaseDate ?? "",
        catalogSource: r.catalogSource ?? "",
        externalId: r.externalId ?? "",
        catalogMetadata: JSON.stringify(r.catalogMetadata ?? {}),
        status: r.status ?? "pending",
        rating: r.rating ?? "-",
        review: r.review ?? "-",
        notes: r.notes ?? "-",
        progress: `${r.progress ?? 0}%`,
        favorite: r.favorite ? "true" : "false",
        rewatches: r.rewatches ?? "-",
        timeSpent: r.timeSpent ? `${r.timeSpent} hours` : "-",
        trackingSource: r.trackingSource ?? "",
        tags: (r.tags ?? []).join(", "),
        visibility: r.visibility ?? "private",
        customFields: JSON.stringify(r.customFields ?? {}),
        seasonsProgress: JSON.stringify(r.seasonsProgress ?? []),

        startedAt: r.startedAt ? r.startedAt.toISOString().slice(0, 16) : "-",
        completedAt: r.completedAt ? r.completedAt.toISOString().slice(0, 16) : "-",
        lastProgressUpdate: r.lastProgressUpdate ? r.lastProgressUpdate.toISOString().slice(0, 16) : "-",

        createdAt: r.createdAt ? r.createdAt.toISOString().slice(0, 16) : "-",
        updatedAt: r.updatedAt ? r.updatedAt.toISOString().slice(0, 16) : "-",
      }));

      // Generate CSV using PapaParse
      const csv = Papa.unparse(csvData, { header: true });

      reply.header("Content-Type", "text/csv");
      reply.header("Content-Disposition", `attachment; filename="user-media-${userId}-${Date.now()}.csv"`);

      return reply.send(csv);
    } catch (error) {
      console.error("Export CSV error:", error);
      return reply.status(500).send({
        success: false,
        error: "Failed to export data",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export default userMediaRoutes;
