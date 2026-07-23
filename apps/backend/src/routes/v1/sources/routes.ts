import {
  sourceIdParamsSchema,
  updateSourceSchema,
} from "@media-voyage/shared/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../../../auth";
import { listSourcesWithUsage } from "./queries";
import { deleteSource, updateSource } from "./service";

async function sourcesRoutes(fastify: FastifyInstance) {
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
      request.log.error(error, "Authentication error in sources routes");
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.get("/", async (request, reply) => {
    const records = await listSourcesWithUsage(request.userId);
    return reply.send(records);
  });

  fastify.patch("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    const input = updateSourceSchema.parse(request.body);
    const result = await updateSource(request.userId, sourceId, input);

    switch (result.status) {
      case "not_found":
        return reply.status(404).send({ error: "Source not found" });
      case "duplicate":
        return reply
          .status(409)
          .send({ error: "A source with that name already exists" });
      case "success":
        return reply.send(result.source);
    }
  });

  fastify.delete("/:sourceId", async (request, reply) => {
    const { sourceId } = sourceIdParamsSchema.parse(request.params);
    const result = await deleteSource(request.userId, sourceId);

    if (result.status === "not_found") {
      return reply.status(404).send({ error: "Source not found" });
    }

    return reply.status(200).send({ success: true });
  });
}

export default sourcesRoutes;
