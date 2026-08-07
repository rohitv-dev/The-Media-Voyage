import { tags, userMediaTags } from "@media-voyage/shared";
import { tagFormSchema, tagIdParamsSchema, updateTagSchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import {
  createNamedEntity,
  deleteNamedEntity,
  listNamedEntitiesWithUsage,
  updateNamedEntity,
} from "./namedEntity";
import { requireAuth } from "@/require-auth";

async function tagsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const records = await listNamedEntitiesWithUsage(tags, userMediaTags.tagId, request.userId);
    return reply.send(records);
  });

  fastify.post("/", async (request, reply) => {
    const input = tagFormSchema.parse(request.body);
    const result = await createNamedEntity(tags, request.userId, input, "tag");

    return reply.status(201).send(result);
  });

  fastify.patch("/:tagId", async (request, reply) => {
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const input = updateTagSchema.parse(request.body);
    const result = await updateNamedEntity(tags, request.userId, tagId, input, "tag");

    return reply.send(result);
  });

  fastify.delete("/:tagId", async (request, reply) => {
    const { tagId } = tagIdParamsSchema.parse(request.params);
    await deleteNamedEntity(tags, request.userId, tagId, "tag");

    return reply.send({ success: true });
  });
}

export default tagsRoutes;
