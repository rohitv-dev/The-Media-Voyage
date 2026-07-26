import {
  mediaDetailsParamsSchema,
  mediaSearchQuerySchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { getGameDetails } from "../../../services/igdb";
import { getOmdbDetails } from "../../../services/omdb";
import { requireAuth } from "../../../require-auth";
import { searchMedia } from "./service";

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
      return reply.send(await getOmdbDetails(id));
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
      return reply.send(await getGameDetails(id));
    },
  );
}

export default mediaRoutes;

