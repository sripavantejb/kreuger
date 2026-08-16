import { prisma } from "@/lib/prisma";
import { buildLiveChunks } from "./chunkers";
import { embedTexts, hasOpenAIKey } from "./embeddings";

const BATCH = 32;

export type ReindexResult =
  | { ok: true; count: number }
  | { ok: false; reason: "missing_api_key" | "error"; message: string };

/**
 * Full wipe + rebuild of KnowledgeChunk from live DB + static docs.
 * Requires LLM_API_KEY (or OPENAI_API_KEY).
 */
export async function reindexKnowledge(): Promise<ReindexResult> {
  if (!hasOpenAIKey()) {
    return {
      ok: false,
      reason: "missing_api_key",
      message: "LLM_API_KEY is not set — skipping knowledge index.",
    };
  }

  try {
    const prepared = await buildLiveChunks();
    const embeddings: number[][] = [];

    for (let i = 0; i < prepared.length; i += BATCH) {
      const slice = prepared.slice(i, i + BATCH);
      const vectors = await embedTexts(slice.map((c) => `${c.title}\n${c.content}`));
      embeddings.push(...vectors);
    }

    await prisma.knowledgeChunk.deleteMany();

    // MongoDB createMany in Prisma — create in batches
    for (let i = 0; i < prepared.length; i += BATCH) {
      const slice = prepared.slice(i, i + BATCH);
      await Promise.all(
        slice.map((c, j) =>
          prisma.knowledgeChunk.create({
            data: {
              source: c.source,
              sourceId: c.sourceId,
              title: c.title,
              content: c.content,
              embedding: embeddings[i + j]!,
            },
          })
        )
      );
    }

    return { ok: true, count: prepared.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "error", message };
  }
}
