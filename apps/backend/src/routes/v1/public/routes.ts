import { mediaCollectionIdParamsSchema, publicIdParamsSchema, userMediaIdParamsSchema } from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "@/require-auth";
import {
  getOwnerPublicCollectionLink,
  getOwnerPublicLibraryLink,
  getOwnerPublicMediaLink,
  getPublicCollection,
  getPublicLibrary,
  getPublicMedia,
} from "./queries";

async function publicRoutes(fastify: FastifyInstance) {
  fastify.get("/libraries/:publicId", async (request, reply) => {
    const { publicId } = publicIdParamsSchema.parse(request.params);
    return reply.send(await getPublicLibrary(publicId));
  });

  fastify.get("/media/:publicId", async (request, reply) => {
    const { publicId } = publicIdParamsSchema.parse(request.params);
    return reply.send(await getPublicMedia(publicId));
  });

  fastify.get("/collections/:publicId", async (request, reply) => {
    const { publicId } = publicIdParamsSchema.parse(request.params);
    return reply.send(await getPublicCollection(publicId));
  });

  fastify.get("/links/library", { preHandler: requireAuth }, async (request, reply) =>
    reply.send(await getOwnerPublicLibraryLink(request.userId)),
  );

  fastify.get("/links/media/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    return reply.send(await getOwnerPublicMediaLink(request.userId, id));
  });

  fastify.get("/links/collections/:collectionId", { preHandler: requireAuth }, async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(request.params);
    return reply.send(await getOwnerPublicCollectionLink(request.userId, collectionId));
  });
}

export default publicRoutes;
