import type { FastifyContextConfig, FastifyInstance } from "fastify";
import Papa from "papaparse";
import {
  calendarActivityQuerySchema,
  mediaPickerQuerySchema,
  mediaImageFocusSchema,
  userMediaPatchSchema,
  userMediaFormSchema,
  userMediaIdParamsSchema,
  userMediaPageQuerySchema,
  userMediaQuerySchema,
  userMediaQuickActionSchema,
  userMediaSearchQuerySchema,
  semanticSearchQuerySchema,
} from "@media-voyage/shared/api";
import { internalServerError, notFound } from "@/errors";
import { requireAuth } from "@/require-auth";
import {
  generateMediaEmbedding,
  ensureMediaEmbedding,
} from "@/services/mediaEmbeddings";
import { toCsvRows } from "./csv";
import {
  filterUserMedia,
  filterUserMediaPage,
  findUserMediaById,
  getCalendarActivity,
  getDashboardStats,
  getUserMediaCounts,
  getUserMediaDropdowns,
  getUserMediaForExport,
  getUserMediaStatusHistory,
  listDeletedUserMedia,
  listUserMedia,
  pickUserMedia,
  searchUserMedia,
  searchUserMediaHybrid,
} from "./queries";
import {
  createUserMedia,
  deleteUserMedia,
  permanentlyDeleteUserMedia,
  restoreUserMedia,
  updateUserMedia,
  updateUserMediaImageFocus,
  updateUserMediaQuickActions,
} from "./service";

const semanticSearchConfig: FastifyContextConfig = {
  rateLimit: {
    max: 10,
    timeWindow: "1 minute",
  },
};

async function userMediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

  fastify.post("/", async (request, reply) => {
    const input = userMediaFormSchema.parse(request.body);
    const record = await createUserMedia(request.userId, input);

    void ensureMediaEmbedding(record.mediaId).catch((error) => {
      request.log.warn(
        { err: error, mediaId: record.mediaId },
        "Media embedding failed after creation",
      );
    });

    return reply.status(201).send(record);
  });

  fastify.get("/search", async (request, reply) => {
    const { search } = userMediaSearchQuerySchema.parse(request.query);
    const records = await searchUserMedia(request.userId, search);

    return reply.send(records);
  });

  fastify.get(
    "/semantic-search",
    { config: semanticSearchConfig },
    async (request, reply) => {
      const { q } = semanticSearchQuerySchema.parse(request.query);
      reply.header("Cache-Control", "no-store");

      try {
        const embedding = await generateMediaEmbedding(q);
        const records = await searchUserMediaHybrid(
          request.userId,
          q,
          embedding,
        );

        return reply.send(records);
      } catch (error) {
        throw internalServerError("Library search failed", { cause: error });
      }
    },
  );

  fastify.get("/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await findUserMediaById(request.userId, id);

    if (!record) throw notFound("User media not found");

    return reply.send(record);
  });

  fastify.patch("/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = userMediaPatchSchema.parse(request.body);
    const record = await updateUserMedia(request.userId, id, input);

    if (!record) throw notFound("User media not found or not updated");

    return reply.send(record);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await deleteUserMedia(request.userId, id);

    if (!record) throw notFound("User media not found");

    return reply.send({ success: true });
  });

  fastify.get("/trash", async (request, reply) => {
    const records = await listDeletedUserMedia(request.userId);

    return reply.send({
      success: true,
      count: records.length,
      data: records,
    });
  });

  fastify.post("/:id/restore", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await restoreUserMedia(request.userId, id);

    if (!record) throw notFound("Deleted user media not found");

    return reply.send({ success: true });
  });

  fastify.delete("/:id/permanent", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await permanentlyDeleteUserMedia(request.userId, id);

    if (!record) throw notFound("Deleted user media not found");

    return reply.send({ success: true });
  });

  fastify.patch("/:id/quick-actions", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = userMediaQuickActionSchema.parse(request.body);
    const record = await updateUserMediaQuickActions(request.userId, id, input);

    if (!record)
      throw notFound("User media not found or quick actions not updated");

    return reply.send(record);
  });

  fastify.patch("/:id/image-focus", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = mediaImageFocusSchema.parse(request.body);
    const record = await updateUserMediaImageFocus(request.userId, id, input);

    if (!record)
      throw notFound("User media not found or image focus not updated");

    return reply.send(record);
  });

  fastify.get("/:id/status-history", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const history = await getUserMediaStatusHistory(request.userId, id);

    if (!history) throw notFound("User media not found");

    return reply.send(history);
  });

  fastify.get("/pick", async (request, reply) => {
    const filters = mediaPickerQuerySchema.parse(request.query);
    const record = await pickUserMedia(request.userId, filters);

    return reply.send(record);
  });

  fastify.get("/filter", async (request, reply) => {
    const filters = userMediaQuerySchema.parse(request.query);
    const records = await filterUserMedia(request.userId, filters);

    return reply.send({
      success: true,
      count: records.length,
      data: records,
    });
  });

  fastify.get("/filter/page", async (request, reply) => {
    const filters = userMediaPageQuerySchema.parse(request.query);
    const result = await filterUserMediaPage(request.userId, filters);

    return reply.send({
      success: true,
      ...result,
    });
  });

  fastify.get("/", async (request, reply) => {
    const records = await listUserMedia(request.userId);

    return reply.send({
      success: true,
      count: records.length,
      data: records,
    });
  });

  fastify.get("/counts", async (request, reply) => {
    return reply.send(await getUserMediaCounts(request.userId));
  });

  fastify.get("/dropdowns", async (request, reply) => {
    return reply.send(await getUserMediaDropdowns(request.userId));
  });

  fastify.get("/dashboard/stats", async (request, reply) => {
    return reply.send(await getDashboardStats(request.userId));
  });

  fastify.get("/calendar/activity", async (request, reply) => {
    const range = calendarActivityQuerySchema.parse(request.query);
    return reply.send(await getCalendarActivity(request.userId, range));
  });

  fastify.get("/export", async (request, reply) => {
    let records;

    try {
      records = await getUserMediaForExport(request.userId);
    } catch (error) {
      throw internalServerError("Failed to export data", { cause: error });
    }

    const csv = Papa.unparse(toCsvRows(records), { header: true });

    reply.header("Content-Type", "text/csv");
    reply.header(
      "Content-Disposition",
      `attachment; filename="user-media-${request.userId}-${Date.now()}.csv"`,
    );

    return reply.send(csv);
  });
}

export default userMediaRoutes;
