import { env as transformersEnv, pipeline } from "@huggingface/transformers";
import type { InferSelectModel } from "drizzle-orm";
import { resolve } from "node:path";
import { eq, sql } from "drizzle-orm";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  media,
} from "@media-voyage/shared";
import type { CatalogMetadata } from "@media-voyage/shared";
import { db } from "@/db/db";

export const MAX_EMBEDDING_DESCRIPTION_LENGTH = 700;

transformersEnv.cacheDir = resolve(process.cwd(), ".cache", "transformers");

type EmbeddingPipeline = Awaited<ReturnType<typeof pipeline>>;

let embeddingPipeline: EmbeddingPipeline | null = null;
let embeddingPipelinePromise: Promise<EmbeddingPipeline> | null = null;

type EmbeddableMedia = Pick<
  InferSelectModel<typeof media>,
  "title" | "type" | "description" | "metadata"
>;

type SemanticMetadata = {
  genre?: string[];
  keywords?: string[];
  themes?: string[];
  subjects?: string[];
  gameModes?: string[];
  playerPerspectives?: string[];
};

function cleanText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function truncateDescription(value: string) {
  if (value.length <= MAX_EMBEDDING_DESCRIPTION_LENGTH) return value;

  const truncated = value.slice(0, MAX_EMBEDDING_DESCRIPTION_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");

  return truncated
    .slice(0, lastSpace > 0 ? lastSpace : truncated.length)
    .trimEnd();
}

function formatTerms(values: string[] | undefined) {
  const terms = values?.map(cleanText).filter(Boolean) ?? [];
  return terms.length > 0 ? terms.join(", ") : null;
}

function formatType(type: EmbeddableMedia["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatField(label: string, value: string | null | undefined) {
  const content = value ? cleanText(value) : "";
  return content ? `${label}:\n${content}` : null;
}

export function buildMediaEmbeddingText(mediaRecord: EmbeddableMedia): string {
  const metadata = mediaRecord.metadata as CatalogMetadata & SemanticMetadata;

  const fields = [
    formatField("Title", mediaRecord.title),
    formatField("Type", formatType(mediaRecord.type)),
    formatField("Genres", formatTerms(metadata.genre)),
    formatField("Keywords", formatTerms(metadata.keywords)),
    formatField("Themes", formatTerms(metadata.themes)),
    formatField("Subjects", formatTerms(metadata.subjects)),
    formatField("Game modes", formatTerms(metadata.gameModes)),
    formatField(
      "Player perspectives",
      formatTerms(metadata.playerPerspectives),
    ),
    formatField(
      "Description",
      truncateDescription(cleanText(mediaRecord.description)),
    ),
  ].filter((field): field is string => Boolean(field));

  return fields.join("\n\n");
}

async function getEmbeddingPipeline() {
  if (embeddingPipeline) return embeddingPipeline;
  if (embeddingPipelinePromise) return embeddingPipelinePromise;

  embeddingPipelinePromise = pipeline(
    "feature-extraction",
    EMBEDDING_MODEL,
    {
      device: "cpu",
      dtype: "q8",
    },
  )
    .then((loadedPipeline) => {
      embeddingPipeline = loadedPipeline;
      return loadedPipeline;
    })
    .catch((error) => {
      embeddingPipelinePromise = null;
      throw error;
    });

  return embeddingPipelinePromise;
}

export async function disposeMediaEmbeddingPipeline() {
  const currentPipeline = embeddingPipeline;
  embeddingPipeline = null;
  embeddingPipelinePromise = null;

  if (currentPipeline) await currentPipeline.dispose();
}

export async function generateMediaEmbeddings(texts: string[]) {
  if (texts.length === 0) return [];

  const extractor = await getEmbeddingPipeline();
  const output = await extractor(texts, {
    pooling: "mean",
    normalize: true,
  });
  const embeddings = output.tolist() as number[][];

  if (
    embeddings.length !== texts.length ||
    embeddings.some(
      (embedding) => embedding.length !== EMBEDDING_DIMENSIONS,
    )
  ) {
    throw new Error(
      `Transformers.js returned an embedding with an unexpected dimension`,
    );
  }

  return embeddings;
}

export async function generateMediaEmbedding(text: string) {
  const [embedding] = await generateMediaEmbeddings([text]);

  if (!embedding) {
    throw new Error("Transformers.js returned no media embedding");
  }

  return embedding;
}

export async function saveMediaEmbedding(mediaId: string, embedding: number[]) {
  await db
    .update(media)
    .set({
      embedding,
      embeddingModel: EMBEDDING_MODEL,
      embeddingUpdatedAt: new Date(),
      updatedAt: sql`${media.updatedAt}`,
    })
    .where(eq(media.id, mediaId));
}

export async function ensureMediaEmbedding(mediaId: string) {
  const [mediaRecord] = await db
    .select({
      id: media.id,
      title: media.title,
      type: media.type,
      description: media.description,
      metadata: media.metadata,
      embedding: media.embedding,
      embeddingModel: media.embeddingModel,
    })
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);

  if (
    !mediaRecord ||
    (mediaRecord.embedding !== null &&
      mediaRecord.embeddingModel === EMBEDDING_MODEL)
  ) {
    return false;
  }

  const embedding = await generateMediaEmbedding(
    buildMediaEmbeddingText(mediaRecord),
  );
  await saveMediaEmbedding(mediaId, embedding);

  return true;
}
