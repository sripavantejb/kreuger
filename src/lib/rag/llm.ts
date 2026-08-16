import { createOpenAI } from "@ai-sdk/openai";

/** Shared OpenAI-compatible client from LLM_* env vars. */
export function createLlmClient() {
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("LLM_API_KEY is not set");
  }
  return createOpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL?.trim() || "https://api.openai.com/v1",
  });
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
}

export function llmChatModelId(): string {
  return process.env.LLM_MODEL?.trim() || "gpt-4o-mini";
}

/** @deprecated use hasLlmKey */
export const hasOpenAIKey = hasLlmKey;
