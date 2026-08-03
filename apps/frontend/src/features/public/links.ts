import type { PublicLinkResponse } from "@media-voyage/shared/api";
import { useMutation } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "#/lib/api";
import { frontendConfig } from "#/config";
import {
  showErrorNotification,
  showSuccessNotification,
} from "#/lib/notifications";

export type PublicLinkResource = "library" | "media" | "collection";

async function getPublicLink(
  resource: PublicLinkResource,
  resourceId?: string,
) {
  const path =
    resource === "library"
      ? "/public/links/library"
      : `/public/links/${resource === "collection" ? "collections" : "media"}/${encodeURIComponent(resourceId ?? "")}`;

  return api<PublicLinkResponse>(path);
}

function buildPublicUrl(resource: PublicLinkResource, publicId: string) {
  const path =
    resource === "library"
      ? `/public/library/${encodeURIComponent(publicId)}`
      : `/public/${resource === "collection" ? "collections" : "media"}/${encodeURIComponent(publicId)}`;

  return new URL(path, frontendConfig.publicAppUrl).toString();
}

export function useCopyPublicLink(
  resource: PublicLinkResource,
  resourceId?: string,
) {
  const mutation = useMutation({
    mutationFn: async () => {
      const { publicId } = await getPublicLink(resource, resourceId);
      const url = buildPublicUrl(resource, publicId);

      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable in this browser.");
      }

      await navigator.clipboard.writeText(url);
    },
    onSuccess: () => {
      showSuccessNotification({ message: "Public link copied to clipboard." });
    },
    onError: (error) => {
      showErrorNotification({
        message: getApiErrorMessage(error, "Could not copy the public link."),
      });
    },
  });

  return {
    copy: () => mutation.mutate(),
    copying: mutation.isPending,
  };
}
