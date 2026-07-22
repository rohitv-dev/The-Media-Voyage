import {
  addMediaCollectionItemSchema,
  mediaCollectionIdParamsSchema,
  mediaCollectionItemParamsSchema,
  reorderMediaCollectionItemsSchema,
} from "@media-voyage/shared/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../../../auth";
import {
  addCollectionItem,
  getOwnedCollectionItems,
  getOwnedCollectionItemsDetailed,
  removeCollectionItem,
  reorderCollectionItems,
} from "./service";

async function collectionItemRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      request.userId = session.user.id;
    } catch (error) {
      request.log.error(
        error,
        "Authentication error in collection-item routes",
      );
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.get("/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const result = await getOwnedCollectionItems(request.userId, collectionId);

    if (result.status === "collection_not_found") {
      return reply.status(404).send({ error: "Collection not found" });
    }

    return reply.send(result.items);
  });

  fastify.get("/:collectionId/detailed", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );
    const result = await getOwnedCollectionItemsDetailed(
      request.userId,
      collectionId,
    );

    if (result.status === "collection_not_found") {
      return reply.status(404).send({ error: "Collection not found" });
    }

    return reply.send(result.items);
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

    switch (result.status) {
      case "collection_not_found":
        return reply.status(404).send({ error: "Collection not found" });
      case "user_media_required":
        return reply.status(400).send({ error: "userMediaId is required" });
      case "user_media_not_found":
        return reply
          .status(404)
          .send({ error: "Selected media entry not found" });
      case "already_exists":
        return reply
          .status(409)
          .send({ error: "Media is already in this collection" });
      case "success":
        return reply.status(201).send(result.item);
    }
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

    if (result.status === "collection_not_found") {
      return reply.status(404).send({ error: "Collection not found" });
    }
    if (result.status === "items_required") {
      return reply.status(400).send({ error: "items are required" });
    }

    return reply.send({ success: true });
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

    if (result.status === "collection_not_found") {
      return reply.status(404).send({ error: "Collection not found" });
    }
    if (result.status === "item_not_found") {
      return reply.status(404).send({ error: "Collection item not found" });
    }

    return reply.status(200).send({ success: true });
  });
}

export default collectionItemRoutes;
