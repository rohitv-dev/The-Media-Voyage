import { beforeEach, describe, expect, it, vi } from "vitest";
import { media, userMedia, userMediaStatusHistory } from "@media-voyage/shared";
import { userMediaFormSchema } from "@media-voyage/shared/api";

const { ensureProviderCatalogMediaMock, transactionMock } = vi.hoisted(() => ({
  ensureProviderCatalogMediaMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/db/db", () => ({
  db: { transaction: transactionMock },
}));
vi.mock("@/services/providerCatalog", () => ({
  ensureProviderCatalogMedia: ensureProviderCatalogMediaMock,
}));

import { createUserMedia } from "./service";

const USER_ID = "user-1";
const CANONICAL_ID = "11111111-1111-4111-8111-111111111111";
const ENTRY_ID = "22222222-2222-4222-8222-222222222222";
const providerIdentity = {
  source: "tmdb_movie" as const,
  externalId: "438631",
};
const resolvedProviderMedia = {
  id: CANONICAL_ID,
  title: "Dune",
  type: "movie" as const,
  imageUrl: "https://image.test/dune.jpg",
  description: "A desert epic.",
  metadata: { genre: ["Adventure"] },
  source: "tmdb_movie" as const,
  externalId: "438631",
};

function createSelectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };

  builder.from.mockReturnValue(builder);
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.for.mockReturnValue(builder);
  return builder;
}

function createInsertBuilder(result: unknown[] = []) {
  const builder = {
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };

  builder.values.mockReturnValue(builder);
  return builder;
}

function createTransaction() {
  const canonicalInsert = createInsertBuilder([{ id: CANONICAL_ID }]);
  const entryInsert = createInsertBuilder([
    { id: ENTRY_ID, status: "planned", progress: 0 },
  ]);
  const historyInsert = { values: vi.fn().mockResolvedValue([]) };
  const selectResults = [[], [{ id: ENTRY_ID, mediaId: CANONICAL_ID }]];
  const tx = {
    select: vi.fn(() => createSelectBuilder(selectResults.shift() ?? [])),
    insert: vi.fn((table) => {
      if (table === media) return canonicalInsert;
      if (table === userMedia) return entryInsert;
      if (table === userMediaStatusHistory) return historyInsert;
      throw new Error("Unexpected insert target");
    }),
  };

  transactionMock.mockImplementation((callback) => callback(tx));
  return { canonicalInsert, entryInsert, tx };
}

function providerInput() {
  return userMediaFormSchema.parse({
    title: "Forged title",
    type: "movie",
    imageUrl: "https://attacker.test/image.jpg",
    description: "Forged description",
    metadata: { genre: ["Forged"] },
    mediaSource: "tmdb_movie",
    externalId: "438631",
    visibility: "private",
  });
}

describe("createUserMedia canonical authority", () => {
  beforeEach(() => {
    ensureProviderCatalogMediaMock.mockReset();
    transactionMock.mockReset();
  });

  it("attaches backend-resolved canonical media without using client fields", async () => {
    ensureProviderCatalogMediaMock.mockResolvedValue(resolvedProviderMedia);
    const { tx } = createTransaction();

    await createUserMedia(USER_ID, providerInput());

    expect(ensureProviderCatalogMediaMock).toHaveBeenCalledWith(
      providerIdentity,
    );
    expect(tx.insert).not.toHaveBeenCalledWith(media);
    expect(tx.insert).toHaveBeenCalledWith(userMedia);
    expect(
      ensureProviderCatalogMediaMock.mock.invocationCallOrder[0],
    ).toBeLessThan(transactionMock.mock.invocationCallOrder[0]);
  });

  it("does not open a user-media transaction when provider verification fails", async () => {
    ensureProviderCatalogMediaMock.mockRejectedValue(
      new Error("Provider unavailable"),
    );

    await expect(createUserMedia(USER_ID, providerInput())).rejects.toThrow(
      "Provider unavailable",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects Playing when the provider resolves a non-game", async () => {
    ensureProviderCatalogMediaMock.mockResolvedValue(resolvedProviderMedia);
    const input = userMediaFormSchema.parse({
      ...providerInput(),
      type: "game",
      status: "playing",
    });

    await expect(createUserMedia(USER_ID, input)).rejects.toThrow(
      "Playing status is only available for games",
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects provider media without an external ID", async () => {
    const input = userMediaFormSchema.parse({
      ...providerInput(),
      externalId: null,
    });

    await expect(createUserMedia(USER_ID, input)).rejects.toThrow(
      "Provider-backed media requires an external ID",
    );
    expect(ensureProviderCatalogMediaMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("attaches a pre-resolved media ID without another provider lookup", async () => {
    createTransaction();
    const input = userMediaFormSchema.parse({
      ...providerInput(),
      mediaId: CANONICAL_ID,
    });

    await createUserMedia(USER_ID, input);

    expect(ensureProviderCatalogMediaMock).not.toHaveBeenCalled();
  });

  it("retains user-supplied canonical fields for manual media", async () => {
    const { canonicalInsert } = createTransaction();
    const input = userMediaFormSchema.parse({
      title: "My documentary",
      type: "movie",
      imageUrl: "https://example.test/manual.jpg",
      description: "Personal notes about the release.",
      metadata: { genre: ["Documentary"] },
      mediaSource: "manual",
      visibility: "private",
    });

    await createUserMedia(USER_ID, input);

    expect(ensureProviderCatalogMediaMock).not.toHaveBeenCalled();
    expect(canonicalInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "My documentary",
        imageUrl: "https://example.test/manual.jpg",
        description: "Personal notes about the release.",
        metadata: { genre: ["Documentary"] },
        source: "manual",
      }),
    );
  });

  it("accepts Playing for a manually added game", async () => {
    const { entryInsert, tx } = createTransaction();
    const input = userMediaFormSchema.parse({
      title: "Brotato",
      type: "game",
      status: "playing",
      mediaSource: "manual",
      visibility: "private",
    });

    await createUserMedia(USER_ID, input);

    expect(tx.insert).toHaveBeenCalledWith(userMedia);
    expect(entryInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({ status: "playing" }),
    );
  });
});
