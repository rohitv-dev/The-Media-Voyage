import { NamedEntityManagementPage } from "#/components/NamedEntityManagementPage";
import { tagsQueryOptions } from "#/features/tags/queries";
import { IconTags } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tags")({
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(tagsQueryOptions);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  return (
    <NamedEntityManagementPage
      entities={tags}
      title="Tag Management"
      description="Rename, recolor, or remove the tags you use across your library."
      emptyIcon={<IconTags size={36} />}
      emptyTitle="No tags yet"
      emptyDescription="Tags you add to media items will show up here."
      basePath="/tags"
      entityLabel="tag"
      invalidateKeys={[["tags"], ["user-media"]]}
      filterKey="tags"
    />
  );
}
