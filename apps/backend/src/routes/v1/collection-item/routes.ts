import {
  addMediaCollectionItemSchema,
  mediaCollectionIdParamsSchema,
  mediaCollectionItemParamsSchema,
  reorderMediaCollectionItemsSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import {
  addCollectionItem,
  getOwnedCollectionItems,
  getOwnedCollectionItemsDetailed,
  removeCollectionItem,
  reorderCollectionItems,
} from "./service";
import { requireAuth } from "@/require-auth";

async function collectionItemRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/:collectionId", async (request) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(request.params);

    return getOwnedCollectionItems(request.userId, collectionId);
  });

  fastify.get("/:collectionId/detailed", async (request) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(request.params);

    return getOwnedCollectionItemsDetailed(request.userId, collectionId);
  });

  fastify.post("/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(request.params);
    const { userMediaId } = addMediaCollectionItemSchema.parse(request.body);
    const item = await addCollectionItem(request.userId, collectionId, userMediaId);

    return reply.status(201).send(item);
  });

  fastify.patch("/:collectionId", async (request) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(request.params);
    const { items } = reorderMediaCollectionItemsSchema.parse(request.body);

    await reorderCollectionItems(request.userId, collectionId, items);

    return { success: true };
  });

  fastify.delete("/:collectionId/:itemId", async (request) => {
    const { collectionId, itemId } = mediaCollectionItemParamsSchema.parse(request.params);

    await removeCollectionItem(request.userId, collectionId, itemId);

    return { success: true };
  });
}

export default collectionItemRoutes;
