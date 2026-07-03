import { createFileRoute } from "@tanstack/react-router";
import { MediaForm } from "#/features/media/components/MediaForm";

export const Route = createFileRoute("/_authenticated/media/add")({
  component: RouteComponent,
});

function RouteComponent() {
  return <MediaForm mode="add" />;
}
