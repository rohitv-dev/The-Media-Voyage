import { api } from "#/lib/api";
import type { SourceRecord, TagRecord } from "@media-voyage/shared/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * Query helpers shared by the structurally identical "named entity" resources
 * (tags, sources). Each is a user-owned list of `{ name, color }` records, so
 * their list query and name→color lookup are generated from one factory
 * instead of being copy-pasted per feature.
 */
export function createNamedEntityQueries<
  T extends { name: string; color: string | null },
>(key: string) {
  const options = queryOptions({
    queryKey: [key],
    queryFn: () => api<T[]>(`/${key}`),
  });

  function useColorMap() {
    const { data } = useQuery(options);

    return useMemo(
      () => new Map((data ?? []).map((item) => [item.name, item.color])),
      [data],
    );
  }

  return { queryOptions: options, useColorMap };
}

export const { queryOptions: tagsQueryOptions, useColorMap: useTagColorMap } =
  createNamedEntityQueries<TagRecord>("tags");

export const {
  queryOptions: sourcesQueryOptions,
  useColorMap: useSourceColorMap,
} = createNamedEntityQueries<SourceRecord>("sources");
