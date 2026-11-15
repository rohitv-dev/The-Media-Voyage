import { createFileRoute, useLocation } from "@tanstack/react-router";
import { MediaForm } from "#/features/media/components/MediaForm/index";
import { useSuspenseQuery } from "@tanstack/react-query";
import { userMediaDropdownOptions } from "#/features/media/queries";
import { toVisibility } from "#/features/media/options";

export const Route = createFileRoute("/_authenticated/media/_forms/add")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(userMediaDropdownOptions);
  const { session } = Route.useRouteContext();
  const recommendationSelection = useLocation({
    select: (location) => location.state.recommendationSelection,
  });
  const addMediaTitle = useLocation({
    select: (location) => location.state.addMediaTitle,
  });
  const locationKey = useLocation({
    select: (location) => location.state.__TSR_key,
  });

  return (
    <MediaForm
      key={addMediaTitle ? locationKey : undefined}
      mode="add"
      dropdowns={data}
      defaultVisibility={toVisibility(session.user.defaultVisibility)}
      recommendationSelection={recommendationSelection}
      initialTitle={addMediaTitle}
    />
  );
}
