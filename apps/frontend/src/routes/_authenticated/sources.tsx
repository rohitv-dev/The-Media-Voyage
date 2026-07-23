import { NamedEntityManagementPage } from "#/components/NamedEntityManagementPage";
import { sourcesQueryOptions } from "#/features/sources/queries";
import { IconDeviceTv } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/sources")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(sourcesQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: sources } = useSuspenseQuery(sourcesQueryOptions);

  return (
    <NamedEntityManagementPage
      entities={sources}
      title="Source Management"
      description="Rename, recolor, or remove the sources you track media against."
      emptyIcon={<IconDeviceTv size={36} />}
      emptyTitle="No sources yet"
      emptyDescription="Sources you add to media items will show up here."
      basePath="/sources"
      entityLabel="source"
      invalidateKeys={[["sources"], ["user-media"]]}
      filterKey="sources"
    />
  );
}
