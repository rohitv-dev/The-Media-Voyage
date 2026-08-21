import { activityListQuerySchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/require-auth";
import { listActivity } from "./service";

async function activityRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const query = activityListQuerySchema.parse(request.query);

    return reply.send(await listActivity(request.userId, query));
  });
}

export default activityRoutes;
