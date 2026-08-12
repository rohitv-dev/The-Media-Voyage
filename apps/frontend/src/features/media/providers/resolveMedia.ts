import { providerCatalogIdentitySchema } from "@media-voyage/shared/api";
import type {
  ProviderCatalogIdentity,
  ResolvedCatalogMedia,
  SeasonProgressEntry,
  SourceMediaRecord,
} from "@media-voyage/shared/api";
import { api } from "#/lib/api";

export function parseProviderIdentity(
  record: SourceMediaRecord,
): ProviderCatalogIdentity | null {
  const result = providerCatalogIdentitySchema.safeParse({
    source: record.source,
    externalId: record.externalId,
  });
  return result.success ? result.data : null;
}

type ResolvedMediaSelection = {
  record: SourceMediaRecord;
  description?: string;
  metadata?: ResolvedCatalogMedia["metadata"];
  seasonsProgress?: SeasonProgressEntry[];
};

export async function resolveMediaSelection(
  record: SourceMediaRecord,
): Promise<ResolvedMediaSelection> {
  const providerIdentity = parseProviderIdentity(record);

  if (!providerIdentity) {
    return { record };
  }

  const resolved = await api<ResolvedCatalogMedia>("/media/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(providerIdentity),
  });
  const seasonsProgress: SeasonProgressEntry[] | undefined =
    resolved.seasons?.map((season) => ({
      season: season.seasonNumber,
      expectedEpisodeCount: season.episodeCount,
      status: "planned",
      episodesWatched: 0,
      updatedAt: new Date().toISOString(),
    }));

  return {
    record: {
      id: resolved.id,
      source: resolved.source,
      externalId: resolved.externalId,
      title: resolved.title,
      type: resolved.type,
      imageUrl: resolved.imageUrl,
    },
    description: resolved.description ?? undefined,
    metadata: Object.keys(resolved.metadata).length
      ? resolved.metadata
      : undefined,
    ...(seasonsProgress?.length ? { seasonsProgress } : {}),
  };
}
