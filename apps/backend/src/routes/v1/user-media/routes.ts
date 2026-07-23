import { fromNodeHeaders } from "better-auth/node";
import type { FastifyInstance } from "fastify";
import Papa from "papaparse";
import {
  calendarActivityQuerySchema,
  mediaPickerQuerySchema,
  userMediaFormSchema,
  userMediaIdParamsSchema,
  userMediaQuerySchema,
  userMediaQuickActionSchema,
} from "@media-voyage/shared/api";
import { auth } from "../../../auth";
import {
  filterUserMedia,
  findUserMediaById,
  getCalendarActivity,
  getDashboardStats,
  getUserMediaCounts,
  getUserMediaDropdowns,
  getUserMediaForExport,
  getUserMediaStatusHistory,
  listUserMedia,
  pickUserMedia,
} from "./queries";
import {
  createUserMedia,
  updateUserMedia,
  updateUserMediaQuickActions,
} from "./service";

async function userMediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", async (request, reply) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      request.userId = session.user.id;
    } catch (error) {
      request.log.error(error, "Authentication error in user-media routes");
      return reply.status(500).send({ error: "Internal authentication error" });
    }
  });

  fastify.post("/", async (request, reply) => {
    const input = userMediaFormSchema.parse(request.body);
    const record = await createUserMedia(request.userId, input);

    return reply.status(201).send(record);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await findUserMediaById(request.userId, id);

    if (!record) {
      return reply.status(404).send({ error: "User media not found" });
    }

    return reply.send(record);
  });

  fastify.patch("/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = userMediaFormSchema.parse(request.body);
    const record = await updateUserMedia(request.userId, id, input);

    if (!record) {
      return reply
        .status(404)
        .send({ error: "User media not found or not updated" });
    }

    return reply.send(record);
  });

  fastify.patch("/:id/quick-actions", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = userMediaQuickActionSchema.parse(request.body);
    const record = await updateUserMediaQuickActions(request.userId, id, input);

    if (!record) {
      return reply.status(404).send({ error: "User media not found" });
    }

    return reply.send(record);
  });

  fastify.get("/:id/status-history", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const history = await getUserMediaStatusHistory(request.userId, id);

    if (!history) {
      return reply.status(404).send({ error: "User media not found" });
    }

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
    try {
      const records = await getUserMediaForExport(request.userId);
      const csv = Papa.unparse(toCsvRows(records), { header: true });

      reply.header("Content-Type", "text/csv");
      reply.header(
        "Content-Disposition",
        `attachment; filename="user-media-${request.userId}-${Date.now()}.csv"`,
      );

      return reply.send(csv);
    } catch (error) {
      request.log.error(error, "User-media CSV export failed");
      return reply.status(500).send({
        success: false,
        error: "Failed to export data",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

function toCsvRows(records: Awaited<ReturnType<typeof getUserMediaForExport>>) {
  return records.map((record) => ({
    id: record.id,
    mediaId: record.mediaId,
    title: record.title ?? "",
    originalTitle: record.originalTitle ?? "",
    type: record.type ?? "",
    description: record.description ?? "",
    imageUrl: record.imageUrl ?? "",
    catalogSource: record.catalogSource ?? "",
    externalId: record.externalId ?? "",
    catalogMetadata: JSON.stringify(record.catalogMetadata ?? {}),
    status: record.status ?? "pending",
    rating: record.rating ?? "-",
    review: record.review ?? "-",
    notes: record.notes ?? "-",
    progress: `${record.progress ?? 0}%`,
    favorite: record.favorite ? "true" : "false",
    rewatches: record.rewatches ?? "-",
    timeSpent: record.timeSpent ? `${record.timeSpent} hours` : "-",
    trackingSource: record.trackingSource ?? "",
    tags: (record.tags ?? []).join(", "),
    visibility: record.visibility ?? "private",
    customFields: JSON.stringify(record.customFields ?? {}),
    seasonsProgress: JSON.stringify(record.seasonsProgress ?? []),
    startedAt: record.startedAt
      ? record.startedAt.toISOString().slice(0, 16)
      : "-",
    completedAt: record.completedAt
      ? record.completedAt.toISOString().slice(0, 16)
      : "-",
    lastProgressUpdate: record.lastProgressUpdate
      ? record.lastProgressUpdate.toISOString().slice(0, 16)
      : "-",
    createdAt: record.createdAt
      ? record.createdAt.toISOString().slice(0, 16)
      : "-",
    updatedAt: record.updatedAt
      ? record.updatedAt.toISOString().slice(0, 16)
      : "-",
  }));
}

export default userMediaRoutes;
