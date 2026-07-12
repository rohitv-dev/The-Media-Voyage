import { MediaCollectionForm } from "#/features/mediaCollection/components/MediaCollectionForm";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/collection/add")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MediaCollectionForm />;
}
