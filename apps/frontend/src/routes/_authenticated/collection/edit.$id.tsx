import { CollectionItemsEditor } from "#/features/media-collection/components/CollectionItemsEditor";
import { collectionQueryOptions } from "#/features/media-collection/queries";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/collection/edit/$id")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(collectionQueryOptions),
  component: RouteComponent,
});

function RouteComponent() {
  return <CollectionItemsEditor />;
}
