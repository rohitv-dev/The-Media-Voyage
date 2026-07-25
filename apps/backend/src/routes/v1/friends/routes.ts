import {
  commentFormSchema,
  commentIdParamsSchema,
  friendRequestSchema,
  friendRespondSchema,
  friendUserIdParamsSchema,
  friendshipIdParamsSchema,
  mediaCollectionIdParamsSchema,
  reactionInputSchema,
  shareLibrarySchema,
  userMediaIdParamsSchema,
} from "@media-voyage/shared/api";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../../require-auth";
import {
  getFriendCollection,
  getFriendsFeed,
  getViewableUserMediaDetail,
  listComments,
  listFriendCollections,
  listFriendMedia,
  listFriendRequests,
  listFriends,
} from "./queries";
import {
  addComment,
  deleteComment,
  removeFriendship,
  respondToFriendRequest,
  sendFriendRequest,
  setReaction,
  shareLibrary,
} from "./service";

async function friendsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  /* Friendship management ------------------------------------------------- */

  fastify.get("/", async (request, reply) => {
    return reply.send(await listFriends(request.userId));
  });

  fastify.get("/requests", async (request, reply) => {
    return reply.send(await listFriendRequests(request.userId));
  });

  fastify.post("/requests", async (request, reply) => {
    const input = friendRequestSchema.parse(request.body);
    const result = await sendFriendRequest(request.userId, input.email);

    return reply.status(201).send(result);
  });

  fastify.patch("/requests/:friendshipId", async (request, reply) => {
    const { friendshipId } = friendshipIdParamsSchema.parse(request.params);
    const input = friendRespondSchema.parse(request.body);

    return reply.send(
      await respondToFriendRequest(request.userId, friendshipId, input),
    );
  });

  fastify.delete("/:userId", async (request, reply) => {
    const { userId } = friendUserIdParamsSchema.parse(request.params);

    return reply.send(await removeFriendship(request.userId, userId));
  });

  fastify.post("/share-library", async (request, reply) => {
    const input = shareLibrarySchema.parse(request.body);

    return reply.send(await shareLibrary(request.userId, input));
  });

  /* Viewing --------------------------------------------------------------- */

  fastify.get("/feed", async (request, reply) => {
    return reply.send(await getFriendsFeed(request.userId));
  });

  fastify.get("/media/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);

    return reply.send(await getViewableUserMediaDetail(request.userId, id));
  });

  fastify.get("/:userId/media", async (request, reply) => {
    const { userId } = friendUserIdParamsSchema.parse(request.params);

    return reply.send(await listFriendMedia(request.userId, userId));
  });

  fastify.get("/:userId/collections", async (request, reply) => {
    const { userId } = friendUserIdParamsSchema.parse(request.params);

    return reply.send(await listFriendCollections(request.userId, userId));
  });

  fastify.get("/collections/:collectionId", async (request, reply) => {
    const { collectionId } = mediaCollectionIdParamsSchema.parse(
      request.params,
    );

    return reply.send(
      await getFriendCollection(request.userId, collectionId),
    );
  });

  /* Social ---------------------------------------------------------------- */

  fastify.put("/media/:id/reaction", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = reactionInputSchema.parse(request.body);

    return reply.send(await setReaction(request.userId, id, input));
  });

  fastify.get("/media/:id/comments", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);

    return reply.send(await listComments(request.userId, id));
  });

  fastify.post("/media/:id/comments", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = commentFormSchema.parse(request.body);

    return reply.status(201).send(await addComment(request.userId, id, input));
  });

  fastify.delete("/comments/:commentId", async (request, reply) => {
    const { commentId } = commentIdParamsSchema.parse(request.params);

    return reply.send(await deleteComment(request.userId, commentId));
  });
}

export default friendsRoutes;
