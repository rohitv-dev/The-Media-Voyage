import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../../auth";
import { searchOmdb } from "../../services/omdb";
import { media } from "@media-voyage/shared";
import type { SourceMediaRecord } from "@media-voyage/shared/api";
import { db } from "../../db/db";
import { ilike, and, eq } from "drizzle-orm";
import { MediaType } from "@media-voyage/shared/userMediaSchema";
import { searchGames } from "../../services/igdb";

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

  fastify.get("/search", async (request, reply) => {
    const { q, type } = request.query as { q?: string; type?: MediaType };

    if (!q?.trim()) {
      return reply.status(400).send({
        error: "Query parameter 'q' is required",
      });
    }

    if (!type) {
      return reply.status(400).send({
        error: "Query parameter 'type' is required",
      });
    }

    // 1. Search local database
    const localResults = await db
      .select({
        id: media.id,
        title: media.title,
        imageUrl: media.imageUrl,
        type: media.type,
        releaseDate: media.releaseDate,
        externalId: media.externalId,
      })
      .from(media)
      .where(and(ilike(media.title, `%${q}%`), eq(media.type, type)))
      .limit(10);

    const localRecords: SourceMediaRecord[] = localResults.map((val) => ({
      id: val.id,
      source: "db",
      title: val.title,
      imageUrl: val.imageUrl,
      type: val.type,
      externalId: val.externalId,
      releaseDate: val.releaseDate ?? "",
    }));

    // 2. If enough local results, don't hit external services
    if (localRecords.length >= 10) {
      return reply.send(localRecords);
    }

    let omdbRecords: SourceMediaRecord[] = [];
    let gameRecords: SourceMediaRecord[] = [];

    switch (type) {
      case "movie":
      case "show":
        omdbRecords = await searchOmdb(q);
        break;
      case "game":
        gameRecords = await searchGames(q);
        break;
    }

    const result: SourceMediaRecord[] = [
      ...localRecords,
      ...omdbRecords,
      ...gameRecords,
    ];

    return reply.send(result);
  });
}

export default mediaRoutes;
