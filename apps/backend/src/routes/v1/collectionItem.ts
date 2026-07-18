import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../../auth";
import { db } from "../../db/db";
import {
  media,
  mediaCollection,
  mediaCollectionItems,
  userMedia,
} from "@media-voyage/shared";
import { and, asc, eq, isNull, max } from "drizzle-orm";

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
      console.error("Authentication error in preHandler:", error);
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.get("/:collectionId", async (request, reply) => {
    const userId = request.userId;
    const { collectionId } = request.params as { collectionId: string };

    const collection = await db
      .select({ id: mediaCollection.id })
      .from(mediaCollection)
      .where(
        and(
          eq(mediaCollection.id, collectionId),
          eq(mediaCollection.userId, userId),
        ),
      )
      .limit(1);

    if (!collection.length) {
      return reply.status(404).send({ error: "Collection not found" });
    }

    const items = await db
      .select({
        id: mediaCollectionItems.id,
        userMediaId: mediaCollectionItems.userMediaId,
        title: media.title,
        type: media.type,
        position: mediaCollectionItems.position,
        createdAt: mediaCollectionItems.createdAt,
      })
      .from(mediaCollectionItems)
      .innerJoin(userMedia, eq(mediaCollectionItems.userMediaId, userMedia.id))
      .innerJoin(media, eq(userMedia.mediaId, media.id))
      .where(eq(mediaCollectionItems.collectionId, collectionId))
      .orderBy(
        asc(mediaCollectionItems.position),
        asc(mediaCollectionItems.createdAt),
      );

    return reply.send(items);
  });

  fastify.post("/:collectionId", async (request, reply) => {
    const userId = request.userId;
    const { collectionId } = request.params as { collectionId: string };
    const { userMediaId } = request.body as { userMediaId: string };

    const collection = await db
      .select({ id: mediaCollection.id })
      .from(mediaCollection)
      .where(
        and(
          eq(mediaCollection.id, collectionId),
          eq(mediaCollection.userId, userId),
        ),
      )
      .limit(1);

    if (!collection.length) {
      return reply.status(404).send({ error: "Collection not found" });
    }

    if (!userMediaId) {
      return reply.status(400).send({ error: "userMediaId is required" });
    }

    const userMediaEntry = await db
      .select({ id: userMedia.id })
      .from(userMedia)
      .where(
        and(
          eq(userMedia.id, userMediaId),
          eq(userMedia.userId, userId),
          isNull(userMedia.deletedAt),
        ),
      )
      .limit(1);

    if (!userMediaEntry.length) {
      return reply
        .status(404)
        .send({ error: "Selected media entry not found" });
    }

    const existing = await db
      .select({ id: mediaCollectionItems.id })
      .from(mediaCollectionItems)
      .where(
        and(
          eq(mediaCollectionItems.collectionId, collectionId),
          eq(mediaCollectionItems.userMediaId, userMediaId),
        ),
      );

    if (existing.length) {
      return reply
        .status(409)
        .send({ error: "Media is already in this collection" });
    }

    const [lastItem] = await db
      .select({ position: max(mediaCollectionItems.position) })
      .from(mediaCollectionItems)
      .where(eq(mediaCollectionItems.collectionId, collectionId));

    const inserted = await db
      .insert(mediaCollectionItems)
      .values({
        collectionId,
        userMediaId,
        position: (lastItem?.position ?? 0) + 1,
      })
      .returning();

    return reply.status(201).send(inserted[0]);
  });

  fastify.patch("/:collectionId", async (request, reply) => {
    const userId = request.userId;
    const { collectionId } = request.params as { collectionId: string };
    const { items } = request.body as {
      items: Array<{ id: string; position: number }>;
    };

    const collection = await db
      .select({ id: mediaCollection.id })
      .from(mediaCollection)
      .where(
        and(
          eq(mediaCollection.id, collectionId),
          eq(mediaCollection.userId, userId),
        ),
      )
      .limit(1);

    if (!collection.length) {
      return reply.status(404).send({ error: "Collection not found" });
    }

    if (!items?.length) {
      return reply.status(400).send({ error: "items are required" });
    }

    await Promise.all(
      items.map((item) =>
        db
          .update(mediaCollectionItems)
          .set({ position: item.position })
          .where(
            and(
              eq(mediaCollectionItems.collectionId, collectionId),
              eq(mediaCollectionItems.id, item.id),
            ),
          ),
      ),
    );

    return reply.send({ success: true });
  });

  fastify.delete("/:collectionId/:itemId", async (request, reply) => {
    const userId = request.userId;
    const { collectionId, itemId } = request.params as {
      collectionId: string;
      itemId: string;
    };

    const collection = await db
      .select({ id: mediaCollection.id })
      .from(mediaCollection)
      .where(
        and(
          eq(mediaCollection.id, collectionId),
          eq(mediaCollection.userId, userId),
        ),
      )
      .limit(1);

    if (!collection.length) {
      return reply.status(404).send({ error: "Collection not found" });
    }

    const deleted = await db
      .delete(mediaCollectionItems)
      .where(
        and(
          eq(mediaCollectionItems.collectionId, collectionId),
          eq(mediaCollectionItems.id, itemId),
        ),
      )
      .returning();

    if (!deleted.length) {
      return reply.status(404).send({ error: "Collection item not found" });
    }

    return reply.status(200).send({ success: true });
  });
}

export default collectionItemRoutes;
