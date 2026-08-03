import {
  createFriendRecommendationSchema,
  recommendationIdParamsSchema,
  resolveRecommendationSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/require-auth";
import { getRecommendationDetail } from "./queries";
import {
  createFriendRecommendation,
  resolveRecommendation,
} from "./service";

async function recommendationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.post("/", async (request, reply) => {
    const input = createFriendRecommendationSchema.parse(request.body);
    const recommendation = await createFriendRecommendation(request.userId, input);

    return reply.status(201).send(recommendation);
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
