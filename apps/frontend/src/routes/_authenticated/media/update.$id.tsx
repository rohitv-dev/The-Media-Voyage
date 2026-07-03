import { MediaForm } from "#/features/media/components/MediaForm";
import { userMediaDetailedOptions } from "#/features/media/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/media/update/$id")({
  loader: ({ context: { queryClient }, params: { id } }) => {
    queryClient.ensureQueryData(userMediaDetailedOptions(id));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(userMediaDetailedOptions(id));

  return <MediaForm id={data.id} mode="update" initialValues={data} />;
}
