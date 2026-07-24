import { createNamedEntityQueries } from "#/lib/namedEntityQueries";
import type { TagRecord } from "@media-voyage/shared/api";

export const { queryOptions: tagsQueryOptions, useColorMap: useTagColorMap } =
  createNamedEntityQueries<TagRecord>("tags");
