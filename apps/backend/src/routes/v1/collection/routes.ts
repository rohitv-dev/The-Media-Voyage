import { mediaCollectionFormSchema } from "@media-voyage/shared/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../../../auth";
import { listMediaCollections } from "./queries";
import { createMediaCollection } from "./service";

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
      request.log.error(error, "Authentication error in collection routes");
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.get("/", async (request, reply) => {
    const collections = await listMediaCollections(request.userId);
    return reply.status(201).send(collections);
  });

  fastify.post("/", async (request, reply) => {
    const input = mediaCollectionFormSchema.parse(request.body);
    const collection = await createMediaCollection(request.userId, input);
    return reply.status(201).send(collection);
  });
}

export default collectionRoutes;
