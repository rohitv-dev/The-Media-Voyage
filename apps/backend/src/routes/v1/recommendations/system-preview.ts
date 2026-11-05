import type {
  SourceMediaRecord,
  SystemRecommendationPreviewResponse,
} from "@media-voyage/shared/api";
import { getGameRecommendations } from "@/services/igdb";
import { getOpenLibraryRecommendations } from "@/services/openLibrary";
import { getTmdbRecommendations } from "@/services/tmdb";
import {
  findDismissedSystemRecommendations,
  findSystemPreviewLibrary,
} from "./queries";

const MAX_PRODUCTIVE_SEEDS = 6;
const FIXED_SEED_COUNT = 4;
const MAX_SEED_ATTEMPTS = 15;
const MAX_CANDIDATES_PER_SEED = 3;
const MAX_RECOMMENDATIONS = 10;

type LibraryItem = Awaited<ReturnType<typeof findSystemPreviewLibrary>>[number];
type PreviewMedia =
  SystemRecommendationPreviewResponse["recommendations"][number]["media"];

type PreviewSeed = LibraryItem & {
  status: "in_progress" | "completed" | "revisiting";
};

type SeedRun = {
  seed: PreviewSeed;
  candidates: {
    media: PreviewMedia;
    identity: string;
    providerIndex: number;
  }[];
};

type CandidateAggregate = {
  candidate: PreviewMedia;
  seeds: PreviewSeed[];
  firstProviderIndex: number;
};

function isPreviewSeed(item: LibraryItem): item is PreviewSeed {
  if (item.status === "revisiting" || item.favorite) return true;

  if (item.rating !== null) {
    return item.rating >= 7;
  }

  return item.status === "completed";
}

function seedTimestamp(seed: PreviewSeed) {
  return Math.max(seed.completedAt?.getTime() ?? 0, seed.updatedAt.getTime());
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
  const seeds = library.filter(isPreviewSeed).sort(compareSeedPriority);

  if (seeds.length > MAX_PRODUCTIVE_SEEDS) {
    for (let index = seeds.length - 1; index > FIXED_SEED_COUNT; index -= 1) {
      const swapIndex =
        FIXED_SEED_COUNT +
        Math.floor(Math.random() * (index - FIXED_SEED_COUNT + 1));
      [seeds[index], seeds[swapIndex]] = [seeds[swapIndex], seeds[index]];
    }
  }

  return seeds.slice(0, MAX_SEED_ATTEMPTS);
}

function positiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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

async function getProviderRecommendations(seed: PreviewSeed) {
  let records: SourceMediaRecord[];

  if (
    (seed.type === "movie" && seed.catalogSource === "tmdb_movie") ||
    (seed.type === "show" && seed.catalogSource === "tmdb_tv")
  ) {
    const id = positiveInteger(seed.externalId);
    if (id === null) return null;
    records = await getTmdbRecommendations(seed.type, id);
  } else if (seed.type === "game" && seed.catalogSource === "igdb") {
    const id = positiveInteger(seed.externalId);
    if (id === null) return null;
    records = await getGameRecommendations(String(id));
  } else if (seed.type === "book" && seed.catalogSource === "open_library") {
    const workId = seed.externalId?.trim();
    if (!workId || !/^OL\d+W$/i.test(workId)) return null;
    records = await getOpenLibraryRecommendations(workId);
  } else {
    return null;
  }

  return records
    .map(toPreviewMedia)
    .filter((candidate): candidate is PreviewMedia => candidate !== null);
}

async function collectSeedRuns(
  library: LibraryItem[],
  seeds: PreviewSeed[],
  dismissedIdentities: string[],
) {
  const excludedTitles = new Set<string>();
  const excludedIdentities = new Set(dismissedIdentities);
  for (const item of library) {
    if (item.catalogSource && item.externalId) {
      excludedIdentities.add(
        mediaIdentity(item.catalogSource, item.externalId),
      );
    } else {
      excludedTitles.add(normalizedTitle(item.type, item.title));
    }
  }

  const runs: SeedRun[] = [];
  const providerErrors: unknown[] = [];
  let providerSucceeded = false;

  for (const seed of seeds) {
    let providerCandidates: PreviewMedia[] | null;
    try {
      providerCandidates = await getProviderRecommendations(seed);
    } catch (error) {
      providerErrors.push(error);
      continue;
    }

    if (providerCandidates === null) continue;
    providerSucceeded = true;

    const candidates: SeedRun["candidates"] = [];
    const seenForSeed = new Set<string>();
    for (const [providerIndex, media] of providerCandidates.entries()) {
      const identity = mediaIdentity(media.source, media.externalId);
      if (
        seenForSeed.has(identity) ||
        excludedIdentities.has(identity) ||
        excludedTitles.has(normalizedTitle(media.type, media.title))
      ) {
        continue;
      }

      seenForSeed.add(identity);
      candidates.push({ media, identity, providerIndex });
      if (candidates.length === MAX_CANDIDATES_PER_SEED) break;
    }

    if (candidates.length === 0) continue;
    runs.push({ seed, candidates });
    if (runs.length === MAX_PRODUCTIVE_SEEDS) break;
  }

  if (!providerSucceeded && providerErrors.length > 0) throw providerErrors[0];

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
  const first = recommendationReason(seeds[0]).replace(/^Because /, "");
  if (seeds.length === 1) return `Because ${first}`;

  const second = recommendationReason(seeds[1]).replace(/^Because /, "");
  if (seeds.length === 2) return `Because ${first} and ${second}`;

  return `Because ${first}, ${second}, and ${seeds.length - 2} other titles you liked`;
}

function buildRecommendations(
  runs: SeedRun[],
): SystemRecommendationPreviewResponse["recommendations"] {
  const aggregates = new Map<string, CandidateAggregate>();

  for (const run of runs) {
    for (const {
      media: candidate,
      identity,
      providerIndex,
    } of run.candidates) {
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
    }
  }

  const ranked = Array.from(aggregates.values()).sort(
    (left, right) =>
      right.seeds.length - left.seeds.length ||
      compareSeedPriority(left.seeds[0], right.seeds[0]) ||
      left.firstProviderIndex - right.firstProviderIndex ||
      mediaIdentity(
        left.candidate.source,
        left.candidate.externalId,
      ).localeCompare(
        mediaIdentity(right.candidate.source, right.candidate.externalId),
      ),
  );
  const queues = runs.map((run) =>
    ranked.filter((aggregate) =>
      aggregate.seeds.some((seed) => seed.userMediaId === run.seed.userMediaId),
    ),
  );
  const selected = new Set<CandidateAggregate>();

  while (
    selected.size < MAX_RECOMMENDATIONS &&
    queues.some((queue) => queue.length > 0)
  ) {
    for (const queue of queues) {
      let candidate = queue.shift();
      while (candidate && selected.has(candidate)) candidate = queue.shift();
      if (!candidate) continue;

      selected.add(candidate);
      if (selected.size === MAX_RECOMMENDATIONS) break;
    }
  }

  return Array.from(selected).map((aggregate) => ({
    reason: combinedRecommendationReason(aggregate.seeds),
    seedUserMediaIds: aggregate.seeds.map((seed) => seed.userMediaId),
    media: aggregate.candidate,
  }));
}

export async function getSystemRecommendationPreview(
  userId: string,
): Promise<SystemRecommendationPreviewResponse> {
  const [library, dismissed] = await Promise.all([
    findSystemPreviewLibrary(userId),
    findDismissedSystemRecommendations(userId),
  ]);
  const eligibleSeedCount = library.filter(isPreviewSeed).length;
  const runs = await collectSeedRuns(
    library,
    selectPreviewSeeds(library),
    dismissed.map((item) => mediaIdentity(item.source, item.externalId)),
  );

  return {
    eligibleSeedCount,
    recommendations: buildRecommendations(runs),
  };
}
