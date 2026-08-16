import { prisma } from "@/lib/prisma";
import { embedText, scoreSimilarity, hasOpenAIKey } from "./embeddings";

export type RetrievedChunk = {
  id: string;
  source: string;
  sourceId: string | null;
  title: string;
  content: string;
  score: number;
};

export async function retrieveRelevantChunks(
  query: string,
  topK = 8
): Promise<{ chunks: RetrievedChunk[]; error?: string }> {
  if (!hasOpenAIKey()) {
    return {
      chunks: [],
      error: "LLM_API_KEY is not configured. Add it to .env and run npm run index-knowledge.",
    };
  }

  const total = await prisma.knowledgeChunk.count();
  if (total === 0) {
    return {
      chunks: [],
      error: "Knowledge index is empty. Run npm run index-knowledge after setting LLM_API_KEY.",
    };
  }

  const queryEmbedding = await embedText(query);
  const all = await prisma.knowledgeChunk.findMany({
    select: {
      id: true,
      source: true,
      sourceId: true,
      title: true,
      content: true,
      embedding: true,
    },
  });

  const scored = all
    .map((row) => ({
      id: row.id,
      source: row.source,
      sourceId: row.sourceId,
      title: row.title,
      content: row.content,
      score: scoreSimilarity(queryEmbedding, row.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return { chunks: scored };
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "No retrieved context.";
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.source}${c.sourceId ? `:${c.sourceId}` : ""}) ${c.title}\n${c.content}`
    )
    .join("\n\n");
}
