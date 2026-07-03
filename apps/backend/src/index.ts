import Fastify from "fastify";
import { prettifyError, treeifyError, ZodError, ZodIssue } from "zod";
import cors from "@fastify/cors";

const fastify = Fastify({
  logger: true,
});

type ApiErrorResponse =
  | {
      success: false;
      type: "validation";
      error: string;
      details: ZodIssue[];
    }
  | {
      success: false;
      type: "server";
      error: string;
    };

fastify.register(cors, {
  origin: "http://localhost:4000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH"],
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
fastify.register(import("./routes/v1/media"), { prefix: "/api/v1" });

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
