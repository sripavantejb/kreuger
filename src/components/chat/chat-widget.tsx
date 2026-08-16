"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "What’s the price for Mastro × 100?",
  "Which OCs are breached?",
  "Show open alerts",
];

function messageText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          if (!res.ok) {
            let message = `Request failed (${res.status})`;
            try {
              const data = (await res.clone().json()) as { error?: string };
              if (data.error) message = data.error;
            } catch {
              /* keep default */
            }
            throw new Error(message);
          }
          return res;
        },
      }),
    []
  );

  const { messages, sendMessage, status, error, clearError, setMessages } = useChat({
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    clearError();
    await sendMessage({ text });
  }

  function askExample(prompt: string) {
    if (busy) return;
    clearError();
    setInput("");
    void sendMessage({ text: prompt });
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {open && (
        <div
          className="pointer-events-auto flex h-[min(32rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          role="dialog"
          aria-label="Ops assistant"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight text-foreground">Ops assistant</div>
              <div className="text-xs text-muted-foreground">Ask about quotations, OCs, alerts</div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                  onClick={() => {
                    setMessages([]);
                    clearError();
                  }}
                >
                  Clear
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && !error && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask anything about plant ops data. Try one of these:
                </p>
                <div className="flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => askExample(ex)}
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const text = messageText(m.parts);
              if (!text) return null;
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={cn("flex", isUser ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap",
                      isUser
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground"
                    )}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="text-xs text-muted-foreground">Thinking…</div>
            )}

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error.message || "Something went wrong. Check LLM_API_KEY and run npm run index-knowledge."}
              </div>
            )}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products, OCs, alerts…"
                rows={2}
                className="min-h-11 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSubmit(e);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={busy || !input.trim()}
                aria-label="Send"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      <Button
        type="button"
        size="icon-lg"
        className="pointer-events-auto size-12 rounded-full shadow-md"
        aria-label={open ? "Close ops assistant" : "Open ops assistant"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
}
