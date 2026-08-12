import Fastify from "fastify";
import { userMediaQuerySchema } from "@media-voyage/shared/api";
import { afterEach, describe, expect, it } from "vitest";
import { registerErrorHandler } from "@/error-handler";

describe("user-media filter request parsing", () => {
  const app = Fastify();

  registerErrorHandler(app);
  app.get("/", async (request) => userMediaQuerySchema.parse(request.query));

  afterEach(() => app.close());

  it("returns a validation response for malformed JSON filters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/?status=not-json",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      type: "validation",
      code: "VALIDATION_ERROR",
    });
  });
});
