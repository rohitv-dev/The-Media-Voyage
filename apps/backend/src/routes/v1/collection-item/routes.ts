import {
  addMediaCollectionItemSchema,
  mediaCollectionIdParamsSchema,
  mediaCollectionItemParamsSchema,
  reorderMediaCollectionItemsSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import {
  addCollectionItem,
  getOwnedCollectionItems,
  getOwnedCollectionItemsDetailed,
  removeCollectionItem,
  reorderCollectionItems,
  sendAddCollectionItemResult,
  sendCollectionItemsResult,
  sendRemoveCollectionItemResult,
  sendReorderCollectionItemsResult,
} from "./service";

async function collectionItemRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.get("/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const result = await getOwnedCollectionItems(request.userId, collectionId);

    return sendCollectionItemsResult(reply, result);
  });

  fastify.get("/:collectionId/detailed", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const result = await getOwnedCollectionItemsDetailed(
      request.userId,
      collectionId,
    );

    return sendCollectionItemsResult(reply, result);
  });

  fastify.post("/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const { userMediaId } = addMediaCollectionItemSchema.parse(request.body);
    const result = await addCollectionItem(
      request.userId,
      collectionId,
      userMediaId,
    );

    return sendAddCollectionItemResult(reply, result);
  });

  fastify.patch("/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const { items } = reorderMediaCollectionItemsSchema.parse(request.body);
    const result = await reorderCollectionItems(
      request.userId,
      collectionId,
      items,
    );

    return sendReorderCollectionItemsResult(reply, result);
  });

  fastify.delete("/:collectionId/:itemId", async (request, reply) => {
    const { collectionId, itemId } = mediaCollectionItemParamsSchema.parse(
      request.params,
    );
    const result = await removeCollectionItem(
      request.userId,
      collectionId,
      itemId,
    );

    return sendRemoveCollectionItemResult(reply, result);
  });
}

export default collectionItemRoutes;
