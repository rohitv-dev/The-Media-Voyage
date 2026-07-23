import { createNamedEntityQueries } from "#/lib/namedEntityQueries";
import type { SourceRecord } from "@media-voyage/shared/api";

export const {
  queryOptions: sourcesQueryOptions,
  useColorMap: useSourceColorMap,
} = createNamedEntityQueries<SourceRecord>("sources");
