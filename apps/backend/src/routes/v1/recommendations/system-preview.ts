import type {
  SourceMediaRecord,
  SystemRecommendationPreviewResponse,
} from "@media-voyage/shared/api";
import { getGameRecommendations } from "@/services/igdb";
import { getOpenLibraryRecommendations } from "@/services/openLibrary";
import { getTmdbRecommendations } from "@/services/tmdb";
import { findSystemPreviewLibrary } from "./queries";

const MAX_PRODUCTIVE_SEEDS = 6;
const MAX_SEED_ATTEMPTS = 15;
const MAX_CANDIDATES_PER_SEED = 3;
const MAX_RECOMMENDATIONS = 10;

type LibraryItem = Awaited<ReturnType<typeof findSystemPreviewLibrary>>[number];
type PreviewMedia =
  SystemRecommendationPreviewResponse["recommendations"][number]["media"];
type ProviderIdentity = Pick<PreviewMedia, "source" | "externalId" | "type">;

type PreviewSeed = LibraryItem & {
  status: "in_progress" | "completed" | "revisiting";
  deletedAt: null;
};

type SeedRun = {
  seed: PreviewSeed;
  mappingStatus: "mapped" | "unmapped" | "provider_error";
  mappingReason: SystemRecommendationPreviewResponse["seeds"][number]["mappingReason"];
  mappedMedia: ProviderIdentity | null;
  candidates: PreviewMedia[];
  error?: unknown;
};

type CandidateAggregate = {
  candidate: PreviewMedia;
  seeds: PreviewSeed[];
  firstProviderIndex: number;
};

function isPreviewSeed(item: LibraryItem): item is PreviewSeed {
  if (item.deletedAt !== null) return false;

  if (item.status === "completed" || item.status === "revisiting") {
    return true;
  }

  return (
    item.status === "in_progress" &&
    (item.favorite || (item.rating !== null && item.rating >= 7))
  );
}

function seedTimestamp(seed: PreviewSeed) {
  return (seed.completedAt ?? seed.updatedAt).getTime();
}

function compareSeedPriority(left: PreviewSeed, right: PreviewSeed) {
  return (
    Number(right.favorite) - Number(left.favorite) ||
    (right.rating ?? -1) - (left.rating ?? -1) ||
    seedTimestamp(right) - seedTimestamp(left) ||
    left.userMediaId.localeCompare(right.userMediaId)
  );
}

export function selectPreviewSeeds(library: LibraryItem[]): PreviewSeed[] {
  return library
    .filter(isPreviewSeed)
    .sort(compareSeedPriority)
    .slice(0, MAX_SEED_ATTEMPTS);
}

function positiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapSeedToProvider(seed: PreviewSeed) {
  if (
    (seed.type === "movie" && seed.catalogSource === "tmdb_movie") ||
    (seed.type === "show" && seed.catalogSource === "tmdb_tv")
  ) {
    const tmdbId = positiveInteger(seed.externalId);
    return {
      mappedMedia: tmdbId
        ? {
            source:
              seed.type === "movie"
                ? ("tmdb_movie" as const)
                : ("tmdb_tv" as const),
            externalId: String(tmdbId),
            type: seed.type,
          }
        : null,
      mappingReason: tmdbId ? "provider_id" : "invalid_external_id",
    } as const;
  }

  if (seed.type === "game" && seed.catalogSource === "igdb") {
    const gameId = positiveInteger(seed.externalId);
    return {
      mappedMedia: gameId
        ? {
            source: "igdb" as const,
            externalId: String(gameId),
            type: "game" as const,
          }
        : null,
      mappingReason: gameId ? "provider_id" : "invalid_external_id",
    } as const;
  }

  if (seed.type === "book" && seed.catalogSource === "open_library") {
    const workId = seed.externalId?.trim();
    const isWorkId = workId && /^OL\d+W$/i.test(workId);
    return {
      mappedMedia: isWorkId
        ? {
            source: "open_library" as const,
            externalId: workId,
            type: "book" as const,
          }
        : null,
      mappingReason: isWorkId ? "provider_id" : "invalid_external_id",
    } as const;
  }

  return { mappedMedia: null, mappingReason: "unsupported_source" } as const;
}

function toPreviewMedia(record: SourceMediaRecord): PreviewMedia | null {
  if (!record.externalId) return null;

  const isSupported =
    (record.source === "tmdb_movie" && record.type === "movie") ||
    (record.source === "tmdb_tv" && record.type === "show") ||
    (record.source === "igdb" && record.type === "game") ||
    (record.source === "open_library" && record.type === "book");

  if (!isSupported) return null;

  return {
    source: record.source,
    externalId: record.externalId,
    title: record.title,
    type: record.type,
    imageUrl: record.imageUrl,
    creators: record.creators,
    genres: record.genres,
    numberOfPages: record.numberOfPages,
  } as PreviewMedia;
}

async function getProviderRecommendations(
  seed: PreviewSeed,
  mappedMedia: ProviderIdentity,
) {
  let candidates: SourceMediaRecord[];

  if (seed.type === "movie" || seed.type === "show") {
    const tmdbId = positiveInteger(mappedMedia.externalId);
    if (!tmdbId) return [];
    candidates = await getTmdbRecommendations(seed.type, tmdbId);
  } else if (seed.type === "game") {
    candidates = await getGameRecommendations(mappedMedia.externalId);
  } else {
    candidates = await getOpenLibraryRecommendations(mappedMedia.externalId);
  }

  return candidates
    .map(toPreviewMedia)
    .filter((candidate): candidate is PreviewMedia => candidate !== null);
}

async function runSeed(seed: PreviewSeed): Promise<SeedRun> {
  let mappedMedia: ProviderIdentity | null = null;

  try {
    const mapping = mapSeedToProvider(seed);
    mappedMedia = mapping.mappedMedia;
    if (!mappedMedia) {
      return {
        seed,
        mappingStatus: "unmapped",
        mappingReason: mapping.mappingReason,
        mappedMedia: null,
        candidates: [],
      };
    }

    return {
      seed,
      mappingStatus: "mapped",
      mappingReason: mapping.mappingReason,
      mappedMedia,
      candidates: await getProviderRecommendations(seed, mappedMedia),
    };
  } catch (error) {
    return {
      seed,
      mappingStatus: "provider_error",
      mappingReason: "provider_error",
      mappedMedia,
      candidates: [],
      error,
    };
  }
}

async function collectSeedRuns(seeds: PreviewSeed[]) {
  const runs: SeedRun[] = [];
  let productiveSeedCount = 0;

  for (const seed of seeds) {
    const run = await runSeed(seed);
    runs.push(run);

    if (run.mappingStatus === "mapped" && run.candidates.length > 0) {
      productiveSeedCount += 1;
    }
    if (productiveSeedCount === MAX_PRODUCTIVE_SEEDS) break;
  }

  return runs;
}

function normalizedTitle(type: LibraryItem["type"], title: string) {
  return `${type}:${title.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ")}`;
}

function mediaIdentity(source: string, externalId: string) {
  return `${source}:${externalId}`;
}

function recommendationReason(seed: PreviewSeed) {
  if (seed.favorite) return `Because "${seed.title}" is a favorite`;
  if (seed.rating !== null) {
    return `Because you rated "${seed.title}" ${seed.rating}/10`;
  }
  if (seed.status === "revisiting") {
    return `Because you're revisiting "${seed.title}"`;
  }
  return `Because you completed "${seed.title}"`;
}

function combinedRecommendationReason(seeds: PreviewSeed[]) {
  const reasons = seeds.map((seed) =>
    recommendationReason(seed).replace(/^Because /, ""),
  );

  if (reasons.length === 1) return `Because ${reasons[0]}`;
  if (reasons.length === 2) return `Because ${reasons.join(" and ")}`;

  return `Because ${reasons.slice(0, -1).join(", ")}, and ${reasons.at(-1)}`;
}

function buildRecommendations(
  library: LibraryItem[],
  runs: SeedRun[],
): SystemRecommendationPreviewResponse["recommendations"] {
  const activeLibrary = library.filter((item) => item.deletedAt === null);
  const excludedTitles = new Set(
    activeLibrary.map((item) => normalizedTitle(item.type, item.title)),
  );
  const excludedIdentities = new Set(
    activeLibrary.flatMap((item) =>
      item.catalogSource && item.externalId
        ? [mediaIdentity(item.catalogSource, item.externalId)]
        : [],
    ),
  );

  const aggregates = new Map<string, CandidateAggregate>();

  for (const run of runs) {
    const seenForSeed = new Set<string>();
    let acceptedForSeed = 0;

    for (const [providerIndex, candidate] of run.candidates.entries()) {
      const identity = mediaIdentity(candidate.source, candidate.externalId);
      const title = normalizedTitle(candidate.type, candidate.title);

      if (
        seenForSeed.has(identity) ||
        excludedIdentities.has(identity) ||
        excludedTitles.has(title)
      ) {
        continue;
      }

      seenForSeed.add(identity);
      acceptedForSeed += 1;

      const existing = aggregates.get(identity);
      if (existing) {
        if (
          !existing.seeds.some(
            (seed) => seed.userMediaId === run.seed.userMediaId,
          )
        ) {
          existing.seeds.push(run.seed);
          existing.seeds.sort(compareSeedPriority);
        }
        existing.firstProviderIndex = Math.min(
          existing.firstProviderIndex,
          providerIndex,
        );
      } else {
        aggregates.set(identity, {
          candidate,
          seeds: [run.seed],
          firstProviderIndex: providerIndex,
        });
      }

      if (acceptedForSeed === MAX_CANDIDATES_PER_SEED) break;
    }
  }

  return Array.from(aggregates.values())
    .sort(
      (left, right) =>
        right.seeds.length - left.seeds.length ||
        compareSeedPriority(left.seeds[0], right.seeds[0]) ||
        left.firstProviderIndex - right.firstProviderIndex ||
        mediaIdentity(left.candidate.source, left.candidate.externalId).localeCompare(
          mediaIdentity(right.candidate.source, right.candidate.externalId),
        ),
    )
    .slice(0, MAX_RECOMMENDATIONS)
    .map((aggregate, index) => ({
      rank: index + 1,
      reason: combinedRecommendationReason(aggregate.seeds),
      seedUserMediaId: aggregate.seeds[0].userMediaId,
      seedUserMediaIds: aggregate.seeds.map((seed) => seed.userMediaId),
      media: aggregate.candidate,
    }));
}

export async function getSystemRecommendationPreview(
  userId: string,
): Promise<SystemRecommendationPreviewResponse> {
  const library = await findSystemPreviewLibrary(userId);
  const eligibleSeeds = library.filter(isPreviewSeed);
  const seeds = selectPreviewSeeds(library);
  const runs = await collectSeedRuns(seeds);

  if (
    runs.length > 0 &&
    runs.every((run) => run.mappingStatus === "provider_error")
  ) {
    throw runs[0].error;
  }

  return {
    strategyKey: "provider_recommendations",
    strategyVersion: "4",
    eligibleSeedCount: eligibleSeeds.length,
    seeds: runs.map((run) => ({
      userMediaId: run.seed.userMediaId,
      title: run.seed.title,
      type: run.seed.type,
      status: run.seed.status,
      rating: run.seed.rating,
      favorite: run.seed.favorite,
      catalogSource: run.seed.catalogSource,
      catalogExternalId: run.seed.externalId,
      mappingStatus: run.mappingStatus,
      mappingReason: run.mappingReason,
      recommendationSource: run.mappedMedia?.source ?? null,
      recommendationExternalId: run.mappedMedia?.externalId ?? null,
      candidateCount: run.candidates.length,
    })),
    recommendations: buildRecommendations(library, runs),
  } satisfies SystemRecommendationPreviewResponse;
}
