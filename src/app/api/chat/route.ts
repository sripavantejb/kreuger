import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { getSession } from "@/lib/auth";
import { formatChunksForPrompt, retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { createLlmClient, hasLlmKey, llmChatModelId } from "@/lib/rag/llm";
import { dashboardTools } from "@/lib/rag/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role !== "user") continue;
    const text = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

const SYSTEM = `You are Kreuger Ops Assistant for the manufacturing operations dashboard.

You have FULL read access to live dashboard data via tools:
- getDashboardSnapshot, listProducts, listQuotations, listSalesOrders, listOrders,
  listAlerts, listManpowerPlans, listMasterData, getReportsSummary, lookupRecord

Rules:
- For list/count/status questions (alerts, OCs, SOs, products, reports, dashboard), CALL the appropriate tool(s) so answers use complete live data — do not guess from partial RAG snippets alone.
- Alerts are a notification log (not open/closed tickets). When asked about alerts, call listAlerts and summarize subjects.
- Use retrieved context for semantic detail; use tools for exhaustive or current facts.
- Cite concrete identifiers (quotation / SO / OC numbers, product codes).
- Do not invent stock, prices, or statuses. Currency is INR.
- Refuse unrelated non-ops topics briefly.
- Be concise and operational.`;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasLlmKey()) {
    return Response.json(
      {
        error:
          "LLM_API_KEY is not configured. Add it to .env, then run npm run index-knowledge.",
      },
      { status: 503 }
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = body.messages ?? [];
  if (messages.length === 0) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const query = lastUserText(messages);
  const { chunks, error: retrieveError } = await retrieveRelevantChunks(query || "overview", 12);

  if (retrieveError && chunks.length === 0) {
    return Response.json({ error: retrieveError }, { status: 503 });
  }

  const context = formatChunksForPrompt(chunks);
  const openai = createLlmClient();

  const result = streamText({
    model: openai(llmChatModelId()),
    system: `${SYSTEM}\n\nRetrieved context (semantic RAG):\n${context}`,
    messages: await convertToModelMessages(messages),
    tools: dashboardTools,
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse();
}
