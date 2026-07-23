import { api } from "#/lib/api";
import type { SourceRecord } from "@media-voyage/shared/api";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

async function getSources() {
  return api<SourceRecord[]>("/sources");
}

export const sourcesQueryOptions = queryOptions({
  queryKey: ["sources"],
  queryFn: getSources,
});

export function useSourceColorMap() {
  const { data } = useQuery(sourcesQueryOptions);

  return useMemo(
    () => new Map((data ?? []).map((source) => [source.name, source.color])),
    [data],
  );
}
