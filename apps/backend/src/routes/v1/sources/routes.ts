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
  sendNamedEntityCreate,
  sendNamedEntityDelete,
  sendNamedEntityUpdate,
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

  fastify.post("/", async (request, reply) => {
    const input = sourceFormSchema.parse(request.body);
    const result = await createNamedEntity(sources, request.userId, input);

    return sendNamedEntityCreate(reply, result, "source");
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

    return sendNamedEntityUpdate(reply, result, "source");
  });

  fastify.delete("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    const result = await deleteNamedEntity(sources, request.userId, sourceId);

    return sendNamedEntityDelete(reply, result, "source");
  });
}

export default sourcesRoutes;
