import { api } from "#/lib/api";
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

/** Entries in the collection that its visibility does not reach on its own. */
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
