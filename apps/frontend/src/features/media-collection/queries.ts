import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";
import type {
  CollectionVisibilityMismatch,
  MediaCollectionItemDetailedRecord,
  MediaCollectionRecord,
  MediaCollectionUpdateSchema,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";

async function getCollections() {
  return api<MediaCollectionRecord[]>("/collection");
}

export const collectionQueryOptions = queryOptions({
  queryKey: queryKeys.collection.all,
  queryFn: getCollections,
});

export const collectionItemsDetailedQueryOptions = (collectionId: string) =>
  queryOptions({
    queryKey: queryKeys.collection.itemsDetailed(collectionId),
    queryFn: () =>
      api<MediaCollectionItemDetailedRecord[]>(
        `/collectionItem/${collectionId}/detailed`,
      ),
  });

export function updateCollection(
  collectionId: string,
  input: MediaCollectionUpdateSchema,
) {
  return api<MediaCollectionRecord>(`/collection/${collectionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Collection entries that its visibility does not reach on its own. */
export function getVisibilityMismatch(collectionId: string) {
  return api<CollectionVisibilityMismatch>(
    `/collection/${collectionId}/visibility-mismatch`,
  );
}

export function bumpCollectionVisibility(collectionId: string) {
  return api<{ updated: number }>(
    `/collection/${collectionId}/bump-visibility`,
    { method: "POST" },
  );
}
