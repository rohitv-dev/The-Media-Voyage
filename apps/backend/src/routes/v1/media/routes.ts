import { mediaSearchQuerySchema } from "@media-voyage/shared/api";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import { auth } from "../../../auth";
import {
  AppError,
  internalServerError,
  unauthorized,
} from "../../../errors";
import { searchMedia } from "./service";

async function mediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        throw unauthorized();
      }

      request.userId = session.user.id;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      request.log.error(error, "Authentication error in media routes");
      throw internalServerError("Internal authentication error", {
        cause: error,
      });
    }
  });

  fastify.get("/search", async (request, reply) => {
    const query = mediaSearchQuerySchema.parse(request.query);
    return reply.send(await searchMedia(query));
  });
}

export default mediaRoutes;
