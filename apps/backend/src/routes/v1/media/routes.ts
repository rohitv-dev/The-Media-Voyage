import { mediaSearchQuerySchema } from "@media-voyage/shared/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../../../auth";
import { searchMedia } from "./service";

async function mediaRoutes(fastify: FastifyInstance) {
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
      request.log.error(error, "Authentication error in media routes");
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.get("/search", async (request, reply) => {
    const query = mediaSearchQuerySchema.parse(request.query);
    return reply.send(await searchMedia(query));
  });
}

export default mediaRoutes;
