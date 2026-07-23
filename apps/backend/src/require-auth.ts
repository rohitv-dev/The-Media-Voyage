import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import { auth } from "./auth";
import { AppError, internalServerError, unauthorized } from "./errors";

/**
 * Fastify `preHandler` that authenticates the request and populates
 * `request.userId`. Register it per route group with:
 *
 * ```ts
 * fastify.addHook("preHandler", requireAuth);
 * ```
 */
export async function requireAuth(request: FastifyRequest) {
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

    request.log.error(error, "Authentication error");
    throw internalServerError("Internal authentication error", {
      cause: error,
    });
  }
}
