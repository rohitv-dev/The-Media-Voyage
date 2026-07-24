import { tags, userMediaTags } from "@media-voyage/shared";
import { tagIdParamsSchema, updateTagSchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import {
  deleteNamedEntity,
  listNamedEntitiesWithUsage,
  sendNamedEntityDelete,
  sendNamedEntityUpdate,
  updateNamedEntity,
} from "../namedEntity";
import { requireAuth } from "../../../require-auth";

async function tagsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const records = await listNamedEntitiesWithUsage(
      tags,
      userMediaTags.tagId,
      request.userId,
    );
    return reply.send(records);
  });

  fastify.patch("/:tagId", async (request, reply) => {
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const input = updateTagSchema.parse(request.body);
    const result = await updateNamedEntity(tags, request.userId, tagId, input);

    return sendNamedEntityUpdate(reply, result, "tag");
  });

  fastify.delete("/:tagId", async (request, reply) => {
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const result = await deleteNamedEntity(tags, request.userId, tagId);

    return sendNamedEntityDelete(reply, result, "tag");
  });
}

export default tagsRoutes;
