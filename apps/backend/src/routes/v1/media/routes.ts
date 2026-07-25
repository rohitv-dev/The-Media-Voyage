import {
  mediaDetailsParamsSchema,
  mediaSearchQuerySchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import {
  getIgdbMediaDetails,
  getOmdbMediaDetails,
  searchMedia,
} from "./service";

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
      const { id } = mediaDetailsParamsSchema.parse(request.params);
      return reply.send(await getOmdbMediaDetails(id));
    },
  );

  fastify.get(
    "/igdb/:id",
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const { id } = mediaDetailsParamsSchema.parse(request.params);
      return reply.send(await getIgdbMediaDetails(id));
    },
  );
}

export default mediaRoutes;

