import { Button } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import { useCopyPublicLink } from "#/features/public/links";
import type { PublicLinkResource } from "#/features/public/links";

export function CopyPublicLinkButton({
  resource,
  resourceId,
  label = resource === "library"
    ? "Copy public library link"
    : "Copy public link",
}: {
  resource: PublicLinkResource;
  resourceId?: string;
  label?: string;
}) {
  const { copy, copying } = useCopyPublicLink(resource, resourceId);

  return (
    <Button
      variant="light"
      leftSection={<IconLink size={16} />}
      loading={copying}
      onClick={copy}
    >
      {label}
    </Button>
  );
}
