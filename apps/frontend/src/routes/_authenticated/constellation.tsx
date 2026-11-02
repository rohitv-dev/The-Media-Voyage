import LibraryConstellation from "#/features/media/components/LibraryConstellation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/constellation")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <LibraryConstellation
      onOpen={(id) => navigate({ to: "/media/view/$id", params: { id } })}
    />
  );
}
