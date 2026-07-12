import { createFileRoute } from "@tanstack/react-router";
import { MediaForm } from "#/features/media/components/MediaForm";
import { useSuspenseQuery } from "@tanstack/react-query";
import { userMediaDropdownOptions } from "#/features/media/queries";

export const Route = createFileRoute("/_authenticated/media/_forms/add")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(userMediaDropdownOptions);

  return <MediaForm mode="add" dropdowns={data} />;
}
