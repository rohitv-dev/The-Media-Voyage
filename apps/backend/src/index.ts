import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";
import { env } from "./config";
import { registerErrorHandler } from "./error-handler";

const fastify = Fastify({
  logger: true,
});

fastify.register(compress, { global: true });

fastify.register(cors, {
  origin: env.TRUSTED_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

fastify.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
});

registerErrorHandler(fastify);

fastify.register(import("./routes/auth"));

fastify.register(import("./routes/v1/media/routes"), {
  prefix: "/api/v1/media",
});

fastify.register(import("./routes/v1/user-media/routes"), {
  prefix: "/api/v1/user-media",
});

fastify.register(import("./routes/v1/collection/routes"), {
  prefix: "/api/v1/collection",
});

fastify.register(import("./routes/v1/collection-item/routes"), {
  prefix: "/api/v1/collectionItem",
});

fastify.register(import("./routes/v1/tags"), {
  prefix: "/api/v1/tags",
});

fastify.register(import("./routes/v1/sources"), {
  prefix: "/api/v1/sources",
});

fastify.register(import("./routes/v1/friends/routes"), {
  prefix: "/api/v1/friends",
});

fastify.register(import("./routes/v1/notifications/routes"), {
  prefix: "/api/v1/notifications",
});

const start = async () => {
  try {
    await fastify.listen({ host: env.HOST, port: env.PORT });
    fastify.log.info(
      {
        host: env.HOST,
        port: env.PORT,
        authUrl: env.BETTER_AUTH_URL,
      },
      "Server started (deploy smoke test)",
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
