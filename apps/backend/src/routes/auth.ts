import { createHash } from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { FastifyInstance } from "fastify";
import { auth } from "../auth";
import { env } from "../config";
import { internalServerError } from "../errors";

const SESSION_CHECK_PATH = "/api/auth/get-session";
const SESSION_COOKIE_PATTERN =
  /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/;

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

const authRuntimeFingerprint = {
  secret: fingerprint(env.BETTER_AUTH_SECRET),
  database: fingerprint(env.DATABASE_URL),
};

async function responseHasSession(response: Response) {
  const body: unknown = await response.clone().json().catch(() => null);

  return (
    typeof body === "object" &&
    body !== null &&
    "session" in body &&
    body.session !== null
  );
}

async function authRoutes(fastify: FastifyInstance) {
  fastify.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const isSessionCheck = request.url.split("?", 1)[0] === SESSION_CHECK_PATH;
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
        const authSessionPresent = isSessionCheck
          ? await responseHasSession(response)
          : undefined;

        if (isSessionCheck) {
          request.log.info(
            {
              authRuntimeFingerprint,
              authSessionCookiePresent: SESSION_COOKIE_PATTERN.test(
                request.headers.cookie ?? "",
              ),
              authSessionPresent,
              origin: request.headers.origin,
              requestHost: request.headers.host,
              forwardedHost: request.headers["x-forwarded-host"],
              statusCode: response.status,
            },
            "Better Auth session check",
          );
        }

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
