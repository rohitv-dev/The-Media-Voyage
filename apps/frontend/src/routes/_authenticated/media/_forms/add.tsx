import { createFileRoute } from "@tanstack/react-router";
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

  return (
    <MediaForm
      mode="add"
      dropdowns={data}
      defaultVisibility={toVisibility(session.user.defaultVisibility)}
    />
  );
}
