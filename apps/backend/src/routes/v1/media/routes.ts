import {
  mediaSearchQuerySchema,
  omdbDetailsParamsSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import { getOmdbMediaDetails, searchMedia } from "./service";

async function mediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get(
    "/search",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const query = mediaSearchQuerySchema.parse(request.query);
      return reply.send(await searchMedia(query));
    },
  );

  fastify.get(
    "/omdb/:id",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = omdbDetailsParamsSchema.parse(request.params);
      return reply.send(await getOmdbMediaDetails(id));
    },
  );
}

export default mediaRoutes;

