import type {
  PublicCollectionResponse,
  PublicLibraryResponse,
  PublicMediaDetail,
} from "@media-voyage/shared/api";
import { queryOptions } from "@tanstack/react-query";
import { api } from "#/lib/api";
import { queryKeys } from "#/lib/queryKeys";

export function publicLibraryQueryOptions(publicId: string) {
  return queryOptions({
    queryKey: queryKeys.public.library(publicId),
    queryFn: () =>
      api<PublicLibraryResponse>(
        `/public/libraries/${encodeURIComponent(publicId)}`,
      ),
  });
}

export function publicMediaQueryOptions(publicId: string) {
  return queryOptions({
    queryKey: queryKeys.public.media(publicId),
    queryFn: () =>
      api<PublicMediaDetail>(`/public/media/${encodeURIComponent(publicId)}`),
  });
}

export function publicCollectionQueryOptions(publicId: string) {
  return queryOptions({
    queryKey: queryKeys.public.collection(publicId),
    queryFn: () =>
      api<PublicCollectionResponse>(
        `/public/collections/${encodeURIComponent(publicId)}`,
      ),
  });
}
