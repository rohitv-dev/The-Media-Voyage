import { sources, userMedia } from "@media-voyage/shared";
import {
  sourceIdParamsSchema,
  updateSourceSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import {
  deleteNamedEntity,
  listNamedEntitiesWithUsage,
  updateNamedEntity,
} from "../namedEntity";
import { requireAuth } from "../../../require-auth";

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

  fastify.patch("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    const input = updateSourceSchema.parse(request.body);
    const result = await updateNamedEntity(
      sources,
      request.userId,
      sourceId,
      input,
    );

    switch (result.status) {
      case "not_found":
        return reply.status(404).send({ error: "Source not found" });
      case "duplicate":
        return reply
          .status(409)
          .send({ error: "A source with that name already exists" });
      case "success":
        return reply.send(result.entity);
    }
  });

  fastify.delete("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    const result = await deleteNamedEntity(sources, request.userId, sourceId);

    if (result.status === "not_found") {
      return reply.status(404).send({ error: "Source not found" });
    }

    return reply.status(200).send({ success: true });
  });
}

export default sourcesRoutes;
