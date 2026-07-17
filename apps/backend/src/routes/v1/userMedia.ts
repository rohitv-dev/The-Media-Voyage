import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../../auth";
import { media, mediaCollection, userMedia } from "@media-voyage/shared";
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
} from "drizzle-orm";
import {
  userMediaFormSchema,
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

    request.log.info(request.body);

    const parsed = userMediaFormSchema.parse(request.body);

    const { title, type, externalId, imageUrl, releaseDate, mediaSource } =
      parsed;

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

      const [createdUserMedia] = await tx
        .insert(userMedia)
        .values({
          userId,
          mediaId,
          status: parsed.status,
          rating: parsed.rating,
          review: parsed.review,
          notes: parsed.notes,
          startedAt: parsed.startedAt,
          completedAt: parsed.completedAt,
          progress: parsed.progress,
          favorite: parsed.favorite,
          rewatches: parsed.rewatches,
          lastProgressUpdate: parsed.lastProgressUpdate,
          timeSpent: parsed.timeSpent,
          source: parsed.source,
          tags: parsed.tags,
          visibility: parsed.visibility,
          customFields: parsed.customFields,
          seasonsProgress: parsed.seasonsProgress,
        })
        .returning({ id: userMedia.id });

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

    const updated = await db
      .update(userMedia)
      .set(rest)
      .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
      .returning();

    if (!updated.length) {
      return reply
        .status(404)
        .send({ error: "User media not found or not updated" });
    }

    const userMediaRecord = await db
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
        createdAt: userMedia.createdAt,
        updatedAt: userMedia.updatedAt,
      })
      .from(userMedia)
      .where(and(eq(userMedia.id, id), eq(userMedia.userId, userId)))
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .limit(1);

    return reply.send(userMediaRecord[0]);
  });

  fastify.get<{ Querystring: UserMediaQuerySchema }>(
    "/filter",
    async (request, reply) => {
      const userId = request.userId;
      const parsed = userMediaQuerySchema.parse(request.query);

      const conditions = [
        eq(userMedia.userId, userId),
        eq(userMedia.isDeleted, false),
      ];

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
        conditions.push(
          sql`${userMedia.createdAt}::date >= ${parsed.createdFrom}::date`,
        );
      }

      if (parsed.createdTo) {
        conditions.push(
          sql`${userMedia.createdAt}::date <= ${parsed.createdTo}::date`,
        );
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
          rating: userMedia.rating,
          favorite: userMedia.favorite,
          source: userMedia.source,

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
    },
  );

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
        rating: userMedia.rating,
        favorite: userMedia.favorite,
        source: userMedia.source,

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

    return reply.send({
      sources: sourceRows
        .map((row) => row.source)
        .filter((source) => source !== null),
      tags: [...tagsByNormalizedValue.values()].sort((a, b) =>
        a.localeCompare(b),
      ),
    });
  });

  fastify.get("/dashboard/stats", async (request, reply) => {
    const userId = request.userId;

    function statusSelect(status: Status) {
      return db
        .select({ count: count() })
        .from(userMedia)
        .where(
          and(
            eq(userMedia.userId, userId),
            eq(userMedia.status, status),
            eq(userMedia.isDeleted, false),
          ),
        );
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
        .where(
          and(eq(userMedia.userId, userId), eq(userMedia.isDeleted, false)),
        ),

      statusSelect("completed"),
      statusSelect("in_progress"),
      statusSelect("planned"),
      statusSelect("dropped"),
      statusSelect("on_hold"),

      db
        .select({ count: count() })
        .from(mediaCollection)
        .where(eq(mediaCollection.userId, userId)),

      //-----------------------------------
      // Status chart
      //-----------------------------------

      db
        .select({
          status: userMedia.status,
          count: count(),
        })
        .from(userMedia)
        .where(
          and(eq(userMedia.userId, userId), eq(userMedia.isDeleted, false)),
        )
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
        .where(
          and(eq(userMedia.userId, userId), eq(userMedia.isDeleted, false)),
        )
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
        .where(
          and(
            eq(userMedia.userId, userId),
            eq(userMedia.isDeleted, false),
            isNotNull(userMedia.rating),
          ),
        )
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
            eq(userMedia.isDeleted, false),
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

          startedAt: userMedia.startedAt,
          completedAt: userMedia.completedAt,

          createdAt: userMedia.createdAt,
          updatedAt: userMedia.updatedAt,
        })
        .from(userMedia)
        .innerJoin(media, eq(userMedia.mediaId, media.id))
        .where(eq(userMedia.userId, userId));

      // Convert to plain objects for CSV
      const csvData = records.map((r) => ({
        id: r.id,
        title: r.title ?? "",
        type: r.type ?? "",
        description: r.description ?? "",
        status: r.status ?? "pending",
        rating: r.rating ?? "-",
        review: r.review ?? "-",
        notes: r.notes ?? "-",
        progress: `${r.progress ?? 0}%`,
        favorite: r.favorite ? "true" : "false",
        rewatches: r.rewatches ?? "-",
        timeSpent: r.timeSpent ? `${r.timeSpent} hours` : "-",

        startedAt: r.startedAt ? r.startedAt.toISOString().slice(0, 16) : "-",
        completedAt: r.completedAt
          ? r.completedAt.toISOString().slice(0, 16)
          : "-",

        createdAt: r.createdAt ? r.createdAt.toISOString().slice(0, 16) : "-",
        updatedAt: r.updatedAt ? r.updatedAt.toISOString().slice(0, 16) : "-",
      }));

      // Generate CSV using PapaParse
      const csv = Papa.unparse(csvData, { header: true });

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="user-media-${userId}-${Date.now()}.csv"`,
      );

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
