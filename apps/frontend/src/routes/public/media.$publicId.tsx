import {
  PublicFrame,
  PublicRouteError,
} from "#/features/public/components/PublicFrame";
import { PublicMediaDetail } from "#/features/public/components/PublicMediaDetail";
import { publicMediaQueryOptions } from "#/features/public/queries";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/public/media/$publicId")({
  loader: ({ context: { queryClient }, params: { publicId } }) =>
    queryClient.ensureQueryData(publicMediaQueryOptions(publicId)),
  errorComponent: PublicRouteError,
  component: RouteComponent,
});

function RouteComponent() {
  const { publicId } = Route.useParams();
  const { data } = useSuspenseQuery(publicMediaQueryOptions(publicId));

  return (
    <PublicFrame ownerName={data.ownerName} context="Public media">
      <PublicMediaDetail data={data} />
    </PublicFrame>
  );
}
