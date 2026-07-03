import { api } from "#/lib/api";
import { queryOptions } from "@tanstack/react-query";
import type {
  UserMediaCounts,
  GetUserMediaResponse,
  MediaDetailedRecord,
  UserMediaQuerySchema,
} from "@media-voyage/shared/api";

async function getUserMedia() {
  return api<GetUserMediaResponse>("/user-media");
}

async function getUserMediaDetailedRecord(id: string) {
  return api<MediaDetailedRecord>(`/user-media/${id}`);
}

async function getUserMediaFilterRecords(filters: UserMediaQuerySchema) {
  const params = new URLSearchParams(
    Object.entries(filters)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      .filter(([, value]) => value != null)
      .map(([key, value]) => [key, String(value)]),
  );

  return api<GetUserMediaResponse>(
    `/user-media/filter${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

async function getUserMediaCounts() {
  return api<UserMediaCounts>("/user-media/counts");
}

export function userMediaDetailedOptions(id: string) {
  return queryOptions({
    queryKey: ["user-media", { id }],
    queryFn: () => getUserMediaDetailedRecord(id),
  });
}

export const userMediaQueryOptions = queryOptions({
  queryKey: ["user-media"],
  queryFn: getUserMedia,
});

export function userMediaFilterQueryOptions(filters: UserMediaQuerySchema) {
  return queryOptions({
    queryKey: ["user-media", filters],
    queryFn: () => getUserMediaFilterRecords(filters),
  });
}

export const userMediaCountOptions = queryOptions({
  queryKey: ["user-media", "count"],
  queryFn: getUserMediaCounts,
});
