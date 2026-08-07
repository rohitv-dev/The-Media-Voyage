import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { media, type CatalogMetadata } from "@media-voyage/shared/schema";
import { getGameDetails } from "@/services/igdb";
import { getOmdbDetails } from "@/services/omdb";
import { getOpenLibraryDetails } from "@/services/openLibrary";
import { getTvMazeDetails } from "@/services/tvMaze";
import {
  applyCatalogRefresh,
  refreshIgdb,
  refreshOmdb,
  refreshOpenLibrary,
  refreshTvMaze,
  type CatalogRefresh,
  type CatalogRefreshMode,
} from "./catalogMetadataRefresh";

const REQUEST_DELAY_MS = 250;

type CatalogRecord = {
  id: string;
  source: string | null;
  externalId: string | null;
  type: "movie" | "show" | "game" | "book";
  description: string | null;
  metadata: CatalogMetadata;
};

type RefreshSummary = {
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
};

function parseMode(args: string[]): CatalogRefreshMode | null {
  if (args.length !== 1) return null;
  if (args[0] === "--dry-run") return "dry-run";
  if (args[0] === "--apply") return "apply";
  return null;
}

function delay() {
  return new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
}

function isSupportedProviderRecord(record: CatalogRecord): boolean {
  if (!record.externalId) return false;

  return (
    (record.source === "omdb" && record.type === "movie") ||
    (record.source === "igdb" && record.type === "game") ||
    (record.source === "tvmaze" && record.type === "show") ||
    (record.source === "open_library" && record.type === "book")
  );
}

async function refreshFromProvider(
  record: CatalogRecord,
): Promise<CatalogRefresh | null> {
  if (!isSupportedProviderRecord(record) || !record.externalId) return null;

  switch (record.source) {
    case "omdb":
      return record.type === "movie"
        ? refreshOmdb(await getOmdbDetails(record.externalId))
        : null;
    case "igdb":
      return record.type === "game"
        ? refreshIgdb(await getGameDetails(record.externalId))
        : null;
    case "tvmaze":
      return record.type === "show"
        ? refreshTvMaze(await getTvMazeDetails(record.externalId))
        : null;
    case "open_library":
      return record.type === "book"
        ? refreshOpenLibrary(await getOpenLibraryDetails(record.externalId))
        : null;
    default:
      return null;
  }
}

function hasChanges(refresh: CatalogRefresh) {
  return refresh.metadata !== undefined || refresh.description !== undefined;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  if (!mode) {
    console.error(
      "Usage: node apps/backend/dist/refresh-catalog-metadata.cjs --dry-run|--apply",
    );
    process.exitCode = 1;
    return;
  }

  const records: CatalogRecord[] = await db
    .select({
      id: media.id,
      source: media.source,
      externalId: media.externalId,
      type: media.type,
      description: media.description,
      metadata: media.metadata,
    })
    .from(media);

  const summary: RefreshSummary = {
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
  };

  console.info(`Refreshing ${records.length} catalog records (${mode})...`);

  for (const [index, record] of records.entries()) {
    const shouldRefresh = isSupportedProviderRecord(record);

    try {
      if (!shouldRefresh) {
        summary.skipped += 1;
        continue;
      }

      const refreshed = await refreshFromProvider(record);
      if (!refreshed) {
        summary.skipped += 1;
        continue;
      }

      if (!hasChanges(refreshed)) {
        summary.unchanged += 1;
        continue;
      }

      const outcome = await applyCatalogRefresh(
        mode,
        record,
        refreshed,
        async (changes) => {
          await db
            .update(media)
            .set(changes)
            .where(and(eq(media.id, record.id)));
        },
      );

      if (outcome === "unchanged") {
        summary.unchanged += 1;
        continue;
      }

      summary.updated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`Failed to refresh media ${record.id}:`, error);
    } finally {
      if (shouldRefresh && index < records.length - 1) {
        await delay();
      }
    }
  }

  console.info("Catalog metadata refresh complete:", summary);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

void main();
