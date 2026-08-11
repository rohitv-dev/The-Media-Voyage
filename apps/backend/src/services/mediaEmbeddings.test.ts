import { afterEach, describe, expect, it, vi } from "vitest";

const {
  createPipeline,
  extractor,
  disposeExtractor,
  updateMedia,
  setEmbedding,
  whereEmbedding,
} = vi.hoisted(() => {
  const extractor = vi.fn();
  const disposeExtractor = vi.fn().mockResolvedValue(undefined);
  const whereEmbedding = vi.fn().mockResolvedValue([]);
  const setEmbedding = vi.fn(() => ({ where: whereEmbedding }));
  const updateMedia = vi.fn(() => ({ set: setEmbedding }));

  return {
    createPipeline: vi.fn(),
    extractor: Object.assign(extractor, { dispose: disposeExtractor }),
    disposeExtractor,
    updateMedia,
    setEmbedding,
    whereEmbedding,
  };
});

vi.mock("@huggingface/transformers", () => ({
  env: { cacheDir: "" },
  pipeline: createPipeline,
}));

vi.mock("@/db/db", () => ({
  db: { update: updateMedia },
}));

import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@media-voyage/shared";
import {
  buildMediaEmbeddingText,
  disposeMediaEmbeddingPipeline,
  generateMediaEmbeddings,
  MAX_EMBEDDING_DESCRIPTION_LENGTH,
  saveMediaEmbedding,
} from "./mediaEmbeddings";

afterEach(async () => {
  await disposeMediaEmbeddingPipeline();
  createPipeline.mockReset();
  extractor.mockReset();
  disposeExtractor.mockClear();
  updateMedia.mockClear();
  setEmbedding.mockClear();
  whereEmbedding.mockClear();
});

describe("buildMediaEmbeddingText", () => {
  it("returns metadata-first labeled text with type-specific fields", () => {
    const text = buildMediaEmbeddingText({
      title: "  Mass Effect: Andromeda  ",
      type: "game",
      description: "A new  galaxy to explore.",
      metadata: {
        genre: ["Action", "RPG"],
        keywords: ["space exploration", "alien worlds"],
        themes: ["Science fiction"],
        gameModes: ["Single player"],
        playerPerspectives: ["Third person"],
        catalogRating: 70,
      },
    });

    expect(text).toBe(
      [
        "Title:\nMass Effect: Andromeda",
        "Type:\nGame",
        "Genres:\nAction, RPG",
        "Keywords:\nspace exploration, alien worlds",
        "Themes:\nScience fiction",
        "Game modes:\nSingle player",
        "Player perspectives:\nThird person",
        "Description:\nA new galaxy to explore.",
      ].join("\n\n"),
    );
    expect(text).not.toContain("catalogRating");
  });

  it("includes book subjects and omits empty fields", () => {
    const text = buildMediaEmbeddingText({
      title: "The Left Hand of Darkness",
      type: "book",
      description: null,
      metadata: {
        genre: ["Science fiction"],
        subjects: ["Gender", "Political fiction"],
        numberOfPages: 304,
      },
    });

    expect(text).toContain("Genres:\nScience fiction");
    expect(text).toContain("Subjects:\nGender, Political fiction");
    expect(text).not.toContain("Description:");
    expect(text).not.toContain("Tags:");
    expect(text).not.toContain("numberOfPages");
  });

  it("caps the trailing description at a word boundary", () => {
    const description = "long description word ".repeat(500);
    const text = buildMediaEmbeddingText({
      title: "Long description",
      type: "movie",
      description,
      metadata: {},
    });
    const descriptionSection = text
      .split("\n\n")
      .find((section) => section.startsWith("Description:"))
      ?.replace("Description:\n", "");

    expect(descriptionSection).toBeDefined();
    expect(descriptionSection?.length).toBeLessThanOrEqual(
      MAX_EMBEDDING_DESCRIPTION_LENGTH,
    );
    expect(descriptionSection).not.toMatch(/\s$/);
  });
});

describe("generateMediaEmbeddings", () => {
  it("loads MiniLM once and requests normalized mean-pooled vectors", async () => {
    const first = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 1);
    const second = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 2);
    createPipeline.mockResolvedValue(extractor);
    extractor.mockResolvedValue({ tolist: () => [first, second] });

    await expect(generateMediaEmbeddings(["first", "second"])).resolves.toEqual(
      [first, second],
    );

    expect(createPipeline).toHaveBeenCalledTimes(1);
    expect(createPipeline).toHaveBeenCalledWith(
      "feature-extraction",
      EMBEDDING_MODEL,
      { device: "cpu", dtype: "q8" },
    );
    expect(extractor).toHaveBeenCalledWith(["first", "second"], {
      pooling: "mean",
      normalize: true,
    });
  });

  it("propagates model errors and rejects invalid vector dimensions", async () => {
    createPipeline.mockRejectedValueOnce(new Error("MiniLM unavailable"));
    await expect(generateMediaEmbeddings(["query"])).rejects.toThrow(
      "MiniLM unavailable",
    );

    createPipeline.mockResolvedValueOnce(extractor);
    extractor.mockResolvedValueOnce({ tolist: () => [[1, 2]] });
    await expect(generateMediaEmbeddings(["query"])).rejects.toThrow(
      "unexpected dimension",
    );
  });

  it("returns no work for an empty batch", async () => {
    await expect(generateMediaEmbeddings([])).resolves.toEqual([]);
    expect(createPipeline).not.toHaveBeenCalled();
  });

  it("persists the vector with the current model marker", async () => {
    const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, () => 1);

    await expect(
      saveMediaEmbedding("media-id", embedding),
    ).resolves.toBeUndefined();

    expect(updateMedia).toHaveBeenCalledTimes(1);
    expect(setEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({
        embedding,
        embeddingModel: EMBEDDING_MODEL,
        embeddingUpdatedAt: expect.any(Date),
      }),
    );
    expect(whereEmbedding).toHaveBeenCalledTimes(1);
  });
});
