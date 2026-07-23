import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config";
import { registerErrorHandler } from "./error-handler";

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: env.FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

registerErrorHandler(fastify);

fastify.register(import("./routes/auth"));

fastify.register(import("./routes/v1/media"), {
  prefix: "/api/v1/media",
});

fastify.register(import("./routes/v1/user-media"), {
  prefix: "/api/v1/user-media",
});

fastify.register(import("./routes/v1/collection"), {
  prefix: "/api/v1/collection",
});

fastify.register(import("./routes/v1/collection-item"), {
  prefix: "/api/v1/collectionItem",
});

fastify.register(import("./routes/v1/tags"), {
  prefix: "/api/v1/tags",
});

fastify.register(import("./routes/v1/sources"), {
  prefix: "/api/v1/sources",
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
      "Server started",
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
