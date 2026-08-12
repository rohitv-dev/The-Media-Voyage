import { media } from "@media-voyage/shared";
import {
  type ProviderCatalogIdentity,
  type ResolvedCatalogMedia,
} from "@media-voyage/shared/api";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { internalServerError, notFound } from "@/errors";
import {
  refreshIgdb,
  refreshOpenLibrary,
  refreshTmdb,
} from "@/scripts/catalogMetadataRefresh";
import { getGameCatalogRecord } from "./igdb";
import { getOpenLibraryCatalogRecord } from "./openLibrary";
import { getTmdbDetails } from "./tmdb";

type ResolvedProviderCatalogMedia = Omit<ResolvedCatalogMedia, "id">;

export async function fetchProviderCatalogMedia(
  identity: ProviderCatalogIdentity,
): Promise<ResolvedProviderCatalogMedia> {
  switch (identity.source) {
    case "tmdb_movie":
    case "tmdb_tv": {
      const type = identity.source === "tmdb_movie" ? "movie" : "show";
      const details = await getTmdbDetails(type, Number(identity.externalId));
      const catalog = refreshTmdb(details);

      return {
        title: details.title,
        type,
        imageUrl: details.imageUrl,
        description: catalog.description ?? null,
        metadata: catalog.metadata ?? {},
        source: details.source,
        externalId: details.externalId,
        ...(type === "show" ? { seasons: details.seasons } : {}),
      };
    }
    case "igdb": {
      const catalogRecord = await getGameCatalogRecord(identity.externalId);
      if (!catalogRecord) throw notFound("IGDB media not found");

      const catalog = refreshIgdb(catalogRecord.details);
      return {
        title: catalogRecord.record.title,
        type: "game",
        imageUrl: catalogRecord.record.imageUrl,
        description: catalog.description ?? null,
        metadata: catalog.metadata ?? {},
        source: "igdb",
        externalId: String(catalogRecord.details.id),
      };
    }
    case "open_library": {
      const catalogRecord = await getOpenLibraryCatalogRecord(
        identity.externalId,
      );
      if (!catalogRecord) throw notFound("Open Library media not found");

      const catalog = refreshOpenLibrary(catalogRecord.details);
      return {
        title: catalogRecord.record.title,
        type: "book",
        imageUrl: catalogRecord.record.imageUrl,
        description: catalog.description ?? null,
        metadata: catalog.metadata ?? {},
        source: "open_library",
        externalId: catalogRecord.record.externalId,
      };
    }
  }
}

const canonicalMediaSelect = {
  id: media.id,
  title: media.title,
  type: media.type,
  imageUrl: media.imageUrl,
  description: media.description,
  metadata: media.metadata,
};

async function findCanonicalMedia(identity: ProviderCatalogIdentity) {
  const [existing] = await db
    .select(canonicalMediaSelect)
    .from(media)
    .where(
      and(
        eq(media.source, identity.source),
        eq(media.externalId, identity.externalId),
      ),
    )
    .limit(1);

  return existing;
}

async function insertCanonicalMedia(
  resolved: ResolvedProviderCatalogMedia,
): Promise<ResolvedCatalogMedia> {
  const { seasons, ...canonicalValues } = resolved;

  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(media)
      .values(canonicalValues)
      .onConflictDoNothing({ target: [media.source, media.externalId] })
      .returning({ id: media.id });

    if (created) {
      return {
        id: created.id,
        ...canonicalValues,
        ...(seasons ? { seasons } : {}),
      };
    }

    const [concurrent] = await tx
      .select(canonicalMediaSelect)
      .from(media)
      .where(
        and(
          eq(media.source, resolved.source),
          eq(media.externalId, resolved.externalId),
        ),
      )
      .limit(1);

    if (!concurrent) {
      throw internalServerError("Canonical media creation failed");
    }

    return {
      ...concurrent,
      source: resolved.source,
      externalId: resolved.externalId,
      ...(seasons ? { seasons } : {}),
    };
  });
}

export async function ensureProviderCatalogMedia(
  identity: ProviderCatalogIdentity,
): Promise<ResolvedCatalogMedia> {
  const existing = await findCanonicalMedia(identity);

  if (existing) {
    return {
      ...existing,
      source: identity.source,
      externalId: identity.externalId,
    };
  }

  const resolved = await fetchProviderCatalogMedia(identity);
  return insertCanonicalMedia(resolved);
}

export async function resolveProviderMediaSelection(
  identity: ProviderCatalogIdentity,
): Promise<ResolvedCatalogMedia> {
  if (identity.source !== "tmdb_tv") {
    return ensureProviderCatalogMedia(identity);
  }

  const resolved = await fetchProviderCatalogMedia(identity);
  const existing = await findCanonicalMedia(identity);

  if (existing) {
    return {
      ...existing,
      source: resolved.source,
      externalId: resolved.externalId,
      seasons: resolved.seasons,
    };
  }

  return insertCanonicalMedia(resolved);
}
