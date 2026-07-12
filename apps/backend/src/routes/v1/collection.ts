import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../../auth";
import { db } from "../../db/db";
import { mediaCollection } from "@media-voyage/shared";
import { eq } from "drizzle-orm";
import { mediaCollectionFormSchema } from "@media-voyage/shared/api";

async function collectionRoutes(fastify: FastifyInstance) {
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

  fastify.get("/", async (request, reply) => {
    const userId = request.userId;
    const collections = await db
      .select({
        id: mediaCollection.id,
        name: mediaCollection.name,
        description: mediaCollection.description,
        visibility: mediaCollection.visibility,
        createdAt: mediaCollection.createdAt,
      })
      .from(mediaCollection)
      .where(eq(mediaCollection.userId, userId));

    return reply.status(201).send(collections);
  });

  fastify.post("/", async (request, reply) => {
    const userId = request.userId;
    const parsed = mediaCollectionFormSchema.parse(request.body);

    const record = await db
      .insert(mediaCollection)
      .values({
        name: parsed.name,
        description: parsed.description,
        visibility: parsed.visibility,
        userId,
      })
      .returning();

    const collection = record[0];

    return reply.status(201).send(collection);
  });
}

export default collectionRoutes;
