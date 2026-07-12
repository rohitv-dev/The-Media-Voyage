import { MediaForm } from "#/features/media/components/MediaForm";
import {
  userMediaDetailedOptions,
  userMediaDropdownOptions,
} from "#/features/media/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/media/_forms/update/$id")(
  {
    loader: ({ context: { queryClient }, params: { id } }) => {
      queryClient.ensureQueryData(userMediaDetailedOptions(id));
    },
    component: RouteComponent,
  },
);

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(userMediaDetailedOptions(id));
  const { data: dropdowns } = useSuspenseQuery(userMediaDropdownOptions);

  return (
    <MediaForm
      id={data.id}
      mode="update"
      initialValues={data}
      dropdowns={dropdowns}
    />
  );
}
