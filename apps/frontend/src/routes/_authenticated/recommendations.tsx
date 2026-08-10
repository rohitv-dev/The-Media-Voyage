import { SystemRecommendationsPage } from "#/features/recommendations/components/SystemRecommendationsPage";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/recommendations")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <SystemRecommendationsPage
      onAdd={(recommendationSelection) =>
        navigate({
          to: "/media/add",
          state: (previous) => ({
            ...previous,
            recommendationSelection,
          }),
        })
      }
    />
  );
}
