import { tagIdParamsSchema, updateTagSchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import { listTagsWithUsage } from "./queries";
import { deleteTag, updateTag } from "./service";

async function tagsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const records = await listTagsWithUsage(request.userId);
    return reply.send(records);
  });

  fastify.patch("/:tagId", async (request, reply) => {
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const input = updateTagSchema.parse(request.body);
    const result = await updateTag(request.userId, tagId, input);

    switch (result.status) {
      case "not_found":
        return reply.status(404).send({ error: "Tag not found" });
      case "duplicate":
        return reply
          .status(409)
          .send({ error: "A tag with that name already exists" });
      case "success":
        return reply.send(result.tag);
    }
  });

  fastify.delete("/:tagId", async (request, reply) => {
    const { tagId } = tagIdParamsSchema.parse(request.params);
    const result = await deleteTag(request.userId, tagId);

    if (result.status === "not_found") {
      return reply.status(404).send({ error: "Tag not found" });
    }

    return reply.status(200).send({ success: true });
  });
}

export default tagsRoutes;
