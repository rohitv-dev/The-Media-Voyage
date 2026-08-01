import { CollectionItemsEditor } from "#/features/media-collection/components/CollectionItemsEditor";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/collection/edit/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  return <CollectionItemsEditor />;
}
