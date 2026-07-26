import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance, FastifyRequest } from "fastify";
import { auth } from "../auth";
import { env } from "../config";
import { internalServerError } from "../errors";

// Only credential-guessing endpoints need a tight limit. Session checks
// (get-session) fire on every route navigation and must stay generous.
const SENSITIVE_AUTH_PATHS = [
  "/api/auth/sign-in",
  "/api/auth/sign-up",
  "/api/auth/forget-password",
  "/api/auth/reset-password",
];

function isSensitiveAuthPath(url: string) {
  return SENSITIVE_AUTH_PATHS.some((path) => url.startsWith(path));
}

async function authRoutes(fastify: FastifyInstance) {
  fastify.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    config: {
      rateLimit: {
        keyGenerator: (request: FastifyRequest) =>
          `${request.ip}:${isSensitiveAuthPath(request.url) ? "auth-sensitive" : "auth-routine"}`,
        max: (request: FastifyRequest) =>
          isSensitiveAuthPath(request.url) ? 5 : 100,
        timeWindow: "1 minute",
      },
    },
    async handler(request, reply) {
      try {
        // Construct request URL
        const url = new URL(request.url, env.BETTER_AUTH_URL);

        // Convert Fastify headers to standard Headers object
        const headers = fromNodeHeaders(request.headers);
        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });
        // Process authentication request
        const response = await auth.handler(req);
        // Forward response to client
        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));
        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        throw internalServerError("Internal authentication error", {
          cause: error,
        });
      }
    },
  });
}

export default authRoutes;
