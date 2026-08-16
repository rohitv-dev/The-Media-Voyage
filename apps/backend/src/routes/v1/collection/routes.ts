import {
  mediaCollectionFormSchema,
  mediaCollectionIdParamsSchema,
  mediaCollectionUpdateSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { findStricterEntries, listMediaCollections } from "./queries";
import {
  bumpCollectionEntryVisibility,
  createMediaCollection,
  updateMediaCollection,
} from "./service";
import { requireAuth } from "@/require-auth";

async function collectionRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/", async (request, reply) => {
    const collections = await listMediaCollections(request.userId);
    return reply.send(collections);
  });

  fastify.post("/", async (request, reply) => {
    const input = mediaCollectionFormSchema.parse(request.body);
    const collection = await createMediaCollection(request.userId, input);
    return reply.status(201).send(collection);
  });

  fastify.patch("/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const input = mediaCollectionUpdateSchema.parse(request.body);

    return reply.send(
      await updateMediaCollection(request.userId, collectionId, input),
    );
  });

  /**
   * Entries the collection's visibility would not reach on its own. The UI
   * asks for this after saving a wider visibility, to offer the bump.
   */
  fastify.get("/:collectionId/visibility-mismatch", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );

    return reply.send(await findStricterEntries(request.userId, collectionId));
  });

  fastify.post("/:collectionId/bump-visibility", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );

    return reply.send(
      await bumpCollectionEntryVisibility(request.userId, collectionId),
    );
  });
}

export default collectionRoutes;
