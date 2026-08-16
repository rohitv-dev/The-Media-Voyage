import { sources, userMedia } from "@media-voyage/shared";
import {
  sourceFormSchema,
  sourceIdParamsSchema,
  updateSourceSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import {
  createNamedEntity,
  deleteNamedEntity,
  listNamedEntitiesWithUsage,
  updateNamedEntity,
} from "./namedEntity";
import { requireAuth } from "@/require-auth";

async function sourcesRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const records = await listNamedEntitiesWithUsage(
      sources,
      userMedia.sourceId,
      request.userId,
    );
    return reply.send(records);
  });

  fastify.post("/", async (request, reply) => {
    const input = sourceFormSchema.parse(request.body);
    const result = await createNamedEntity(
      sources,
      request.userId,
      input,
      "source",
    );

    return reply.status(201).send(result);
  });

  fastify.patch("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    const input = updateSourceSchema.parse(request.body);
    const result = await updateNamedEntity(
      sources,
      request.userId,
      sourceId,
      input,
      "source",
    );

    return reply.send(result);
  });

  fastify.delete("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    await deleteNamedEntity(sources, request.userId, sourceId, "source");

    return reply.send({ success: true });
  });
}

export default sourcesRoutes;
