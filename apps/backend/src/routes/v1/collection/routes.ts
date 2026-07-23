import { mediaCollectionFormSchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import { listMediaCollections } from "./queries";
import { createMediaCollection } from "./service";

async function collectionRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

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
