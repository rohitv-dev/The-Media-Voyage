import {
  mediaSearchQuerySchema,
  providerCatalogIdentitySchema,
  tmdbMediaParamsSchema,
  tmdbWatchProvidersQuerySchema,
} from "@media-voyage/shared/api";
import type { FastifyContextConfig, FastifyInstance } from "fastify";
import {
  getTmdbDetails,
  getTmdbWatchProviders,
  getTmdbWatchRegions,
} from "@/services/tmdb";
import { resolveProviderMediaSelection } from "@/services/providerCatalog";
import { requireAuth } from "@/require-auth";
import { searchMedia } from "./service";

const config: FastifyContextConfig = {
  rateLimit: {
    max: 20,
    timeWindow: "1 minute",
  },
};

async function mediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get(
    "/search",
    {
      config,
    },
    async (request, reply) => {
      const query = mediaSearchQuerySchema.parse(request.query);
      return reply.send(await searchMedia(query));
    },
  );

  fastify.post(
    "/resolve",
    {
      config,
    },
    async (request, reply) => {
      const identity = providerCatalogIdentitySchema.parse(request.body);
      return reply.send(await resolveProviderMediaSelection(identity));
    },
  );

  fastify.get("/tmdb/watch-regions", { config }, async (_request, reply) =>
    reply.send(await getTmdbWatchRegions()),
  );

  fastify.get(
    "/tmdb/:type/:id/watch/providers",
    { config },
    async (request, reply) => {
      const { type, id } = tmdbMediaParamsSchema.parse(request.params);
      const { country } = tmdbWatchProvidersQuerySchema.parse(request.query);
      return reply.send(await getTmdbWatchProviders(type, id, country));
    },
  );

  fastify.get(
    "/tmdb/:type/:id",
    {
      config,
    },
    async (request, reply) => {
      const { type, id } = tmdbMediaParamsSchema.parse(request.params);
      return reply.send(await getTmdbDetails(type, id));
    },
  );
}

export default mediaRoutes;
