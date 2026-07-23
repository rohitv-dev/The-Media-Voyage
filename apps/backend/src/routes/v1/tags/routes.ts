import { tagIdParamsSchema, updateTagSchema } from "@media-voyage/shared/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../../../auth";
import { listTagsWithUsage } from "./queries";
import { deleteTag, updateTag } from "./service";

async function tagsRoutes(fastify: FastifyInstance) {
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
      request.log.error(error, "Authentication error in tags routes");
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

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
