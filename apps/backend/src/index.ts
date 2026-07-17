import Fastify from "fastify";
import { prettifyError, ZodError } from "zod";
import cors from "@fastify/cors";

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, {
  origin: "http://localhost:4000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      type: "validation",
      error: "Validation failed",
      details: prettifyError(error),
    });
  }

  if (error instanceof Error) {
    return reply.status(500).send({
      success: false,
      type: "server",
      error: error.message,
    });
  }

  return reply.status(500).send({
    success: false,
    type: "server",
    error: "Unknown error",
  });
});

fastify.register(import("./routes/auth"));
fastify.register(import("./routes/v1/media"), { prefix: "/api/v1/media" });
fastify.register(import("./routes/v1/userMedia"), { prefix: "/api/v1/user-media" });
fastify.register(import("./routes/v1/collection"), { prefix: "/api/v1/collection" });
fastify.register(import("./routes/v1/collectionItem"), { prefix: "/api/v1/collectionItem" });

fastify.get("/health", async () => {
  return { status: "OK" };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log("Server is running on http://localhost:3000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
