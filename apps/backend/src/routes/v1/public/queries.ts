import {
  media,
  mediaCollection,
  mediaCollectionItems,
  user,
  userMedia,
} from "@media-voyage/shared";
import type {
  PublicCollectionResponse,
  PublicLibraryResponse,
  PublicMediaDetail,
  SeasonProgressEntry,
} from "@media-voyage/shared/api";
import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/db";
import { notFound } from "@/errors";
import { publicMediaDetailSelect, publicMediaSummarySelect } from "./selects";

const publicVisibility = eq(userMedia.visibility, "public");

type PublicMediaDetailWithPrivateSeasonNotes = Omit<
  PublicMediaDetail,
  "seasonsProgress"
> & {
  seasonsProgress: SeasonProgressEntry[];
};

function stripSeasonNotes(
  record: PublicMediaDetailWithPrivateSeasonNotes,
): PublicMediaDetail {
  const seasonsProgress = record.seasonsProgress;

  return {
    ...record,
    seasonsProgress: seasonsProgress.map(
      ({ notes: _notes, ...season }) => season,
    ),
  };
}

async function listPublicMedia(ownerId: string) {
  const records = await db
    .select(publicMediaSummarySelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(
      and(
        eq(userMedia.userId, ownerId),
        publicVisibility,
        isNull(userMedia.deletedAt),
      ),
    )
    .orderBy(desc(userMedia.updatedAt));

  return records;
}

async function countPublicCollectionItems(
  collectionIds: string[],
  ownerId: string,
) {
  if (!collectionIds.length) return new Map<string, number>();

  const rows = await db
    .select({ collectionId: mediaCollectionItems.collectionId, total: count() })
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(mediaCollectionItems.userMediaId, userMedia.id))
    .where(
      and(
        inArray(mediaCollectionItems.collectionId, collectionIds),
        eq(userMedia.userId, ownerId),
        publicVisibility,
        isNull(userMedia.deletedAt),
      ),
    )
    .groupBy(mediaCollectionItems.collectionId);

  return new Map(rows.map((row) => [row.collectionId, row.total]));
}

async function hasPublicLibraryContent(ownerId: string) {
  const [[entry], [collection]] = await Promise.all([
    db
      .select({ id: userMedia.id })
      .from(userMedia)
      .where(
        and(
          eq(userMedia.userId, ownerId),
          publicVisibility,
          isNull(userMedia.deletedAt),
        ),
      )
      .limit(1),
    db
      .select({ id: mediaCollection.id })
      .from(mediaCollection)
      .where(
        and(
          eq(mediaCollection.userId, ownerId),
          eq(mediaCollection.visibility, "public"),
        ),
      )
      .limit(1),
  ]);

  return Boolean(entry || collection);
}

export async function getPublicLibrary(
  publicId: string,
): Promise<PublicLibraryResponse> {
  const [owner] = await db
    .select({ id: user.id, ownerName: user.name })
    .from(user)
    .where(eq(user.publicId, publicId))
    .limit(1);

  if (!owner) throw notFound("Library not found");

  const [data, collections] = await Promise.all([
    listPublicMedia(owner.id),
    db
      .select({
        collectionId: mediaCollection.id,
        publicId: mediaCollection.publicId,
        name: mediaCollection.name,
        description: mediaCollection.description,
        createdAt: mediaCollection.createdAt,
      })
      .from(mediaCollection)
      .where(
        and(
          eq(mediaCollection.userId, owner.id),
          eq(mediaCollection.visibility, "public"),
        ),
      )
      .orderBy(asc(mediaCollection.name)),
  ]);

  if (!data.length && !collections.length) {
    throw notFound("Library not found");
  }

  const itemCounts = await countPublicCollectionItems(
    collections.map((collection) => collection.collectionId),
    owner.id,
  );

  return {
    ownerName: owner.ownerName,
    media: data,
    collections: collections.map((collection) => ({
      publicId: collection.publicId,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      itemCount: itemCounts.get(collection.collectionId) ?? 0,
    })),
  };
}

export async function getPublicMedia(
  publicId: string,
): Promise<PublicMediaDetail> {
  const [record] = await db
    .select(publicMediaDetailSelect)
    .from(userMedia)
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .innerJoin(user, eq(userMedia.userId, user.id))
    .where(
      and(
        eq(userMedia.publicId, publicId),
        publicVisibility,
        isNull(userMedia.deletedAt),
      ),
    )
    .limit(1);

  if (!record) {
    throw notFound("Media entry not found");
  }

  return stripSeasonNotes(record as PublicMediaDetailWithPrivateSeasonNotes);
}

export async function getPublicCollection(
  publicId: string,
): Promise<PublicCollectionResponse> {
  const [collection] = await db
    .select({
      collectionId: mediaCollection.id,
      ownerId: user.id,
      ownerName: user.name,
      publicId: mediaCollection.publicId,
      name: mediaCollection.name,
      description: mediaCollection.description,
      createdAt: mediaCollection.createdAt,
    })
    .from(mediaCollection)
    .innerJoin(user, eq(mediaCollection.userId, user.id))
    .where(
      and(
        eq(mediaCollection.publicId, publicId),
        eq(mediaCollection.visibility, "public"),
      ),
    )
    .limit(1);

  if (!collection) {
    throw notFound("Collection not found");
  }

  const data = await db
    .select(publicMediaSummarySelect)
    .from(mediaCollectionItems)
    .innerJoin(userMedia, eq(mediaCollectionItems.userMediaId, userMedia.id))
    .innerJoin(media, eq(userMedia.mediaId, media.id))
    .where(
      and(
        eq(mediaCollectionItems.collectionId, collection.collectionId),
        eq(userMedia.userId, collection.ownerId),
        publicVisibility,
        isNull(userMedia.deletedAt),
      ),
    )
    .orderBy(
      asc(mediaCollectionItems.position),
      asc(mediaCollectionItems.createdAt),
    );
  return {
    ownerName: collection.ownerName,
    collection: {
      publicId: collection.publicId,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      itemCount: data.length,
    },
    data,
  };
}

export async function getOwnerPublicLibraryLink(
  userId: string,
): Promise<{ publicId: string }> {
  const [owner] = await db
    .select({ publicId: user.publicId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!owner?.publicId) throw notFound("Public library link not available");

  if (!(await hasPublicLibraryContent(userId))) {
    throw notFound(
      "Share at least one public entry or collection before copying the library link",
    );
  }

  return { publicId: owner.publicId };
}

export async function getOwnerPublicMediaLink(
  userId: string,
  userMediaId: string,
): Promise<{ publicId: string }> {
  const [record] = await db
    .select({ publicId: userMedia.publicId })
    .from(userMedia)
    .where(
      and(
        eq(userMedia.id, userMediaId),
        eq(userMedia.userId, userId),
        eq(userMedia.visibility, "public"),
        isNull(userMedia.deletedAt),
      ),
    )
    .limit(1);

  if (!record) throw notFound("Public media link not available");

  return { publicId: record.publicId };
}

export async function getOwnerPublicCollectionLink(
  userId: string,
  collectionId: string,
): Promise<{ publicId: string }> {
  const [collection] = await db
    .select({ publicId: mediaCollection.publicId })
    .from(mediaCollection)
    .where(
      and(
        eq(mediaCollection.id, collectionId),
        eq(mediaCollection.userId, userId),
        eq(mediaCollection.visibility, "public"),
      ),
    )
    .limit(1);

  if (!collection) {
    throw notFound("Public collection link not available");
  }

  return { publicId: collection.publicId };
}
