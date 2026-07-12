import { userMediaQueryOptions } from "#/features/media/queries";
import { CollectionItemsEditor } from "#/features/mediaCollection/components/CollectionItemsEditor";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/collection/edit/$id")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(userMediaQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(userMediaQueryOptions);

  return <CollectionItemsEditor data={data.data} />;
}
