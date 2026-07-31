import type { FastifyInstance } from "fastify";
import Papa from "papaparse";
import {
  calendarActivityQuerySchema,
  mediaPickerQuerySchema,
  mediaImageFocusSchema,
  userMediaFormSchema,
  userMediaIdParamsSchema,
  userMediaQuerySchema,
  userMediaQuickActionSchema,
} from "@media-voyage/shared/api";
import { internalServerError } from "@/errors";
import { requireAuth } from "@/require-auth";
import {
  filterUserMedia,
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

async function userMediaRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth);

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
      return reply.status(404).send({ error: "User media not found or not updated" });
    }

    return reply.send(record);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await deleteUserMedia(request.userId, id);

    if (!record) {
      return reply.status(404).send({ error: "User media not found" });
    }

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

    if (!record) {
      return reply.status(404).send({ error: "Deleted user media not found" });
    }

    return reply.send({ success: true });
  });

  fastify.delete("/:id/permanent", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const record = await permanentlyDeleteUserMedia(request.userId, id);

    if (!record) {
      return reply.status(404).send({ error: "Deleted user media not found" });
    }

    return reply.send({ success: true });
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

  fastify.patch("/:id/image-focus", async (request, reply) => {
    const { id } = userMediaIdParamsSchema.parse(request.params);
    const input = mediaImageFocusSchema.parse(request.body);
    const record = await updateUserMediaImageFocus(request.userId, id, input);

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
    let records;

    try {
      records = await getUserMediaForExport(request.userId);
    } catch (error) {
      throw internalServerError("Failed to export data", { cause: error });
    }

    const csv = Papa.unparse(toCsvRows(records), { header: true });

    reply.header("Content-Type", "text/csv");
    reply.header("Content-Disposition", `attachment; filename="user-media-${request.userId}-${Date.now()}.csv"`);

    return reply.send(csv);
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
    pagesRead: record.pagesRead ?? "-",
    trackingSource: record.trackingSource ?? "",
    tags: (record.tags ?? []).join(", "),
    visibility: record.visibility ?? "private",
    customFields: JSON.stringify(record.customFields ?? {}),
    seasonsProgress: JSON.stringify(record.seasonsProgress ?? []),
    startedAt: record.startedAt ? record.startedAt.toISOString().slice(0, 16) : "-",
    completedAt: record.completedAt ? record.completedAt.toISOString().slice(0, 16) : "-",
    lastProgressUpdate: record.lastProgressUpdate ? record.lastProgressUpdate.toISOString().slice(0, 16) : "-",
    createdAt: record.createdAt ? record.createdAt.toISOString().slice(0, 16) : "-",
    updatedAt: record.updatedAt ? record.updatedAt.toISOString().slice(0, 16) : "-",
  }));
}

export default userMediaRoutes;
