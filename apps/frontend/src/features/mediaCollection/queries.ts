import { api } from "#/lib/api";
import type { MediaCollectionRecord } from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";

async function getCollections() {
  return api<MediaCollectionRecord[]>("/collection");
}

export const collectionQueryOptions = queryOptions({
  queryKey: ["collection"],
  queryFn: getCollections,
});
