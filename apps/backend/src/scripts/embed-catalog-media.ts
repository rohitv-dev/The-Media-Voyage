import { isNull, ne, or } from "drizzle-orm";
import { EMBEDDING_MODEL, media } from "@media-voyage/shared";
import { db } from "@/db/db";
import {
  buildMediaEmbeddingText,
  generateMediaEmbeddings,
  saveMediaEmbedding,
} from "@/services/mediaEmbeddings";

const BATCH_SIZE = 20;

type RunMode = "dry-run" | "apply";

function parseArguments() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const apply = args.has("--apply");

  if (dryRun === apply) {
    throw new Error("Choose exactly one of --dry-run or --apply");
  }

  return {
    mode: (dryRun ? "dry-run" : "apply") as RunMode,
    force: args.has("--force"),
  };
}

async function listEmbeddingRecords(force: boolean) {
  const select = db
    .select({
      id: media.id,
      title: media.title,
      type: media.type,
      description: media.description,
      metadata: media.metadata,
      embedding: media.embedding,
      embeddingModel: media.embeddingModel,
    })
    .from(media);

  return force
    ? select
    : select.where(
        or(
          isNull(media.embedding),
          isNull(media.embeddingModel),
          ne(media.embeddingModel, EMBEDDING_MODEL),
        ),
      );
}

export async function runMediaEmbeddingBackfill(mode: RunMode, force: boolean) {
  const records = await listEmbeddingRecords(force);

  console.log(
    `Embedding ${records.length} catalog records (${mode}${force ? ", force" : ""})...`,
  );

  if (mode === "dry-run") {
    for (const record of records.slice(0, 3)) {
      console.log(
        `- ${record.title}: ${buildMediaEmbeddingText(record).length} characters`,
      );
    }

    console.log(
      `Dry run complete. ${records.length} records would be processed.`,
    );
    return { updated: 0, skipped: 0, failed: 0, total: records.length };
  }

  let updated = 0;
  let failed = 0;

  for (let offset = 0; offset < records.length; offset += BATCH_SIZE) {
    const batch = records.slice(offset, offset + BATCH_SIZE);

    try {
      const embeddings = await generateMediaEmbeddings(
        batch.map(buildMediaEmbeddingText),
      );

      if (embeddings.length !== batch.length) {
        throw new Error(
          "Transformers.js returned an unexpected number of embeddings",
        );
      }

      for (const [index, embedding] of embeddings.entries()) {
        await saveMediaEmbedding(batch[index].id, embedding);
      }

      updated += batch.length;
      console.log(
        `Processed ${Math.min(offset + batch.length, records.length)}/${records.length}`,
      );
    } catch (error) {
      failed += batch.length;
      console.error(
        `Failed batch ${offset + 1}-${offset + batch.length}:`,
        error,
      );
    }
  }

  const summary = { updated, skipped: 0, failed, total: records.length };
  console.log("Embedding complete:", summary);
  return summary;
}

async function main() {
  const { mode, force } = parseArguments();
  const summary = await runMediaEmbeddingBackfill(mode, force);
  process.exitCode = summary.failed > 0 ? 1 : 0;
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
