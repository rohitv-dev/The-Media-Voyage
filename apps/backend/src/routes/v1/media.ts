import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../../auth";
import { media, userMedia } from "@media-voyage/shared";
import { eq, ilike, and, desc, count } from "drizzle-orm";
import { userMediaFormSchema, UserMediaQuerySchema } from "@media-voyage/shared/api";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { db } from "../../db/db";

async function mediaRoutes(fastify: FastifyInstance) {
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

  fastify.get("/media", async (request, reply) => {
    const query = request.query as {
      q?: string;
      type?: "movie" | "show" | "game" | "book";
    };

    const { q, type } = query;

    if (!q || q.trim().length < 3) {
      return [];
    }

    const conditions = [];

    if (type) {
      conditions.push(eq(media.type, type));
    }

    conditions.push(ilike(media.title, `%${q.trim()}%`));

    const results = await db
      .select({
        id: media.id,
        title: media.title,
        type: media.type,
      })
      .from(media)
      .where(and(...conditions))
      .limit(10);

    return results;
  });

  fastify.post("/user-media", async (request, reply) => {
    const userId = request.userId;

    request.log.info(request.body);

    const parsed = userMediaFormSchema.parse(request.body);

    const { title, type, ...rest } = parsed;

    let mediaId = parsed.mediaId;

    if (!mediaId) {
      const createdMedia = await db
        .insert(media)
        .values({
          title: parsed.title!,
          type: parsed.type!,
        })
        .returning({ id: media.id });

      mediaId = createdMedia[0].id;
    }

    const created = await db
      .insert(userMedia)
      .values({
        userId,
        mediaId,
        ...rest,
      })
      .returning({ id: userMedia.id });

    const [record] = await db
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
      .where(eq(userMedia.id, created[0].id))
      .limit(1);

    return reply.status(201).send(record);
  });

  fastify.get("/user-media/:id", async (request, reply) => {
    const userId = request.userId;
    const { id } = request.params as { id: string };

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

    if (!userMediaRecord.length) {
      return reply.status(404).send({ error: "User media not found" });
    }

    return reply.send(userMediaRecord[0]);
  });

  fastify.patch("/user-media/:id", async (request, reply) => {
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
      return reply.status(404).send({ error: "User media not found or not updated" });
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

    return reply.send(userMediaRecord);
  });

  fastify.get<{ Querystring: UserMediaQuerySchema }>("/user-media/filter", async (request, reply) => {
    const userId = request.userId;
    const parsed = userMediaQuerySchema.parse(request.query);

    const conditions = [eq(userMedia.userId, userId)];

    if (parsed.status) {
      conditions.push(eq(userMedia.status, parsed.status));
    }

    if (parsed.favorite !== undefined) {
      conditions.push(eq(userMedia.favorite, parsed.favorite));
    }

    if (parsed.type) {
      conditions.push(eq(media.type, parsed.type));
    }

    if (parsed.search) {
      conditions.push(ilike(media.title, `%${parsed.search}%`));
    }

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
      })
      .from(userMedia)
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(and(...conditions));

    return reply.send({
      success: true,
      count: results.length,
      data: results,
    });
  });

  fastify.get("/user-media", async (request, reply) => {
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

  fastify.get("/user-media/counts", async (request, reply) => {
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

  fastify.get("/seed", async (request, reply) => {
    try {
      // Sample media data
      const sampleMedia = [
        {
          title: "Inception",
          type: "movie" as const,
          originalTitle: "Inception",
          description: "A skilled thief who steals corporate secrets through dream-sharing technology",
          imageUrl: "https://via.placeholder.com/300x450?text=Inception",
          releaseDate: new Date("2010-07-16"),
          externalId: "27205",
          metadata: {
            director: "Christopher Nolan",
            genres: ["sci-fi", "action", "thriller"],
            rating: 8.8,
          },
        },
        {
          title: "Breaking Bad",
          type: "show" as const,
          originalTitle: "Breaking Bad",
          description: "A high school chemistry teacher turned methamphetamine producer",
          imageUrl: "https://via.placeholder.com/300x450?text=Breaking+Bad",
          releaseDate: new Date("2008-01-20"),
          externalId: "1396",
          metadata: {
            genres: ["crime", "drama", "thriller"],
            seasons: 5,
            totalEpisodes: 62,
            rating: 9.5,
          },
        },
        {
          title: "The Witcher 3: Wild Hunt",
          type: "game" as const,
          originalTitle: "The Witcher 3: Wild Hunt",
          description: "An open-world fantasy RPG about a monster hunter named Geralt of Rivia",
          imageUrl: "https://via.placeholder.com/300x450?text=Witcher+3",
          releaseDate: new Date("2015-05-19"),
          externalId: "109644",
          metadata: {
            developer: "CD Projekt Red",
            genres: ["RPG", "action", "adventure"],
            platforms: ["PC", "PS4", "Xbox One"],
            rating: 92,
          },
        },
        {
          title: "Dune",
          type: "book" as const,
          originalTitle: "Dune",
          description: "An epic science fiction novel about politics, ecology, and religion",
          imageUrl: "https://via.placeholder.com/300x450?text=Dune",
          releaseDate: new Date("1965-06-01"),
          externalId: "44",
          metadata: {
            author: "Frank Herbert",
            genres: ["sci-fi", "adventure"],
            pages: 688,
          },
        },
        {
          title: "The Shawshank Redemption",
          type: "movie" as const,
          originalTitle: "The Shawshank Redemption",
          description: "Two imprisoned men bond over a number of years, finding solace in acts of common decency",
          imageUrl: "https://via.placeholder.com/300x450?text=Shawshank",
          releaseDate: new Date("1994-09-23"),
          externalId: "278",
          metadata: {
            director: "Frank Darabont",
            genres: ["drama"],
            rating: 9.3,
          },
        },
      ];

      // Insert media
      const createdMedia = await db.insert(media).values(sampleMedia).returning();

      return reply.status(201).send({
        success: true,
        message: `Successfully seeded database with ${createdMedia.length} media items`,
        data: {
          mediaCount: createdMedia.length,
          media: createdMedia,
        },
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      return reply.status(500).send({
        success: false,
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export default mediaRoutes;
