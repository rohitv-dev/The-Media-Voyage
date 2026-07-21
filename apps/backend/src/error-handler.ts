import type { FastifyError, FastifyInstance } from "fastify";
import { prettifyError, ZodError } from "zod";
import { AppError } from "./errors";

export function registerErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        type: error.type,
        code: error.code,
        error: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId: request.id,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        type: "validation",
        code: "VALIDATION_ERROR",
        error: "Validation failed",
        details: prettifyError(error),
        requestId: request.id,
      });
    }

    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      request.log.warn({ err: error }, "Request validation failed");
      return reply.status(400).send({
        success: false,
        type: "validation",
        code: "VALIDATION_ERROR",
        error: "Validation failed",
        details: fastifyError.message,
        requestId: request.id,
      });
    }

    request.log.error({ err: error }, "Unhandled request error");
    return reply.status(500).send({
      success: false,
      type: "server",
      code: "INTERNAL_SERVER_ERROR",
      error: "Internal server error",
      requestId: request.id,
    });
  });
}
