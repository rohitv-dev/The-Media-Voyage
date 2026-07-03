import { FastifyInstance } from "fastify";
import { ZodError } from "zod";

export function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: "Validation failed",
        details: error.issues,
      });
    }

    if (error instanceof Error) {
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }

    return reply.status(500).send({
      success: false,
      error: "Unknown error",
    });
  });
}
