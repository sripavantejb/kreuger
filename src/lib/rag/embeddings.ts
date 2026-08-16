import { embed, embedMany, cosineSimilarity } from "ai";
import { createLlmClient } from "./llm";

export { hasLlmKey, hasLlmKey as hasOpenAIKey } from "./llm";

function embeddingModel() {
  return createLlmClient().embedding("text-embedding-3-small");
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel(),
    value: text,
  });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { embeddings } = await embedMany({
    model: embeddingModel(),
    values: texts,
  });
  return embeddings;
}

export function scoreSimilarity(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}
