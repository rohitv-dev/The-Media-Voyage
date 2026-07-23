import { api } from "#/lib/api";
import type { TagRecord } from "@media-voyage/shared/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

async function getTags() {
  return api<TagRecord[]>("/tags");
}

export const tagsQueryOptions = queryOptions({
  queryKey: ["tags"],
  queryFn: getTags,
});

export function useTagColorMap() {
  const { data } = useQuery(tagsQueryOptions);

  return useMemo(
    () => new Map((data ?? []).map((tag) => [tag.name, tag.color])),
    [data],
  );
}
