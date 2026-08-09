import {
  mediaDetailsParamsSchema,
  mediaSearchQuerySchema,
  tmdbMediaParamsSchema,
  tmdbSearchQuerySchema,
} from "@media-voyage/shared/api";
import type { FastifyContextConfig, FastifyInstance } from "fastify";
import { getGameDetails } from "@/services/igdb";
import { getOmdbDetails } from "@/services/omdb";
import {
  getTmdbDetails,
  getTmdbRecommendations,
  searchTmdb,
} from "@/services/tmdb";
import { getTvMazeDetails } from "@/services/tvMaze";
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

  fastify.get(
    "/tmdb/search",
    {
      config,
    },
    async (request, reply) => {
      const { q, type } = tmdbSearchQuerySchema.parse(request.query);
      return reply.send(await searchTmdb(q, type));
    },
  );

  fastify.get(
    "/tmdb/:type/:id/recommendations",
    {
      config,
    },
    async (request, reply) => {
      const { type, id } = tmdbMediaParamsSchema.parse(request.params);
      return reply.send(await getTmdbRecommendations(type, id));
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

  fastify.get(
    "/omdb/:id",
    {
      config,
    },
    async (request, reply) => {
      const { id } = mediaDetailsParamsSchema.parse(request.params);
      return reply.send(await getOmdbDetails(id));
    },
  );

  fastify.get(
    "/igdb/:id",
    {
      config,
    },
    async (request, reply) => {
      const { id } = mediaDetailsParamsSchema.parse(request.params);
      return reply.send(await getGameDetails(id));
    },
  );

  fastify.get(
    "/tvmaze/:id",
    {
      config,
    },
    async (request, reply) => {
      const { id } = mediaDetailsParamsSchema.parse(request.params);
      return reply.send(await getTvMazeDetails(id));
    },
  );
}

export default mediaRoutes;
