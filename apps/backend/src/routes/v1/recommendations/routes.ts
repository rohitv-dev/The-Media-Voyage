import {
  createFriendRecommendationSchema,
  dismissSystemRecommendationSchema,
  recommendationIdParamsSchema,
  resolveRecommendationSchema,
} from "@media-voyage/shared/api";
import type { FastifyContextConfig, FastifyInstance } from "fastify";
import { requireAuth } from "@/require-auth";
import {
  dismissSystemRecommendation,
  getRecommendationDetail,
} from "./queries";
import { createFriendRecommendation, resolveRecommendation } from "./service";
import { getSystemRecommendationPreview } from "./system-preview";

const systemPreviewConfig: FastifyContextConfig = {
  rateLimit: {
    max: 5,
    timeWindow: "1 minute",
  },
};

async function recommendationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.post("/", async (request, reply) => {
    const input = createFriendRecommendationSchema.parse(request.body);
    const recommendation = await createFriendRecommendation(
      request.userId,
      input,
    );

    return reply.status(201).send(recommendation);
  });

  fastify.get(
    "/system/preview",
    { config: systemPreviewConfig },
    async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      return reply.send(await getSystemRecommendationPreview(request.userId));
    },
  );

  fastify.post("/system/dismiss", async (request, reply) => {
    const input = dismissSystemRecommendationSchema.parse(request.body);
    await dismissSystemRecommendation(
      request.userId,
      input.source,
      input.externalId,
    );

    return reply.send({ success: true });
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = recommendationIdParamsSchema.parse(request.params);

    return reply.send(await getRecommendationDetail(request.userId, id));
  });

  fastify.patch("/:id/resolve", async (request, reply) => {
    const { id } = recommendationIdParamsSchema.parse(request.params);
    const input = resolveRecommendationSchema.parse(request.body);

    return reply.send(await resolveRecommendation(request.userId, id, input));
  });
}

export default recommendationRoutes;
