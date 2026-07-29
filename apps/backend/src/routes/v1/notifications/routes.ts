import { notificationListQuerySchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import { listNotifications } from "./queries";
import { markAllNotificationsSeen } from "./service";

async function notificationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const query = notificationListQuerySchema.parse(request.query);

    return reply.send(await listNotifications(request.userId, query));
  });

  fastify.patch("/seen", async (request, reply) => {
    return reply.send(await markAllNotificationsSeen(request.userId));
  });
}

export default notificationRoutes;
