import { api } from "#/lib/api";
import type {
  MediaCollectionItemDetailedRecord,
  MediaCollectionRecord,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";

async function getCollections() {
  return api<MediaCollectionRecord[]>("/collection");
}

export const collectionQueryOptions = queryOptions({
  queryKey: ["collection"],
  queryFn: getCollections,
});

export const collectionItemsDetailedQueryOptions = (collectionId: string) =>
  queryOptions({
    queryKey: ["collection-items-detailed", collectionId],
    queryFn: () =>
      api<MediaCollectionItemDetailedRecord[]>(
        `/collectionItem/${collectionId}/detailed`,
      ),
  });
