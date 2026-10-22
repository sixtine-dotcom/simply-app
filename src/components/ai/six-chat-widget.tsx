"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bot, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  communityHref?: string | null;
};

const STARTERS = [
  "Ik heb een vraag over mijn traject",
  "Kan je iets uit de lessen verduidelijken?",
  "Waar vind ik mijn voedingsschema?",
];

export function SixChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendMessage(preset?: string) {
    const text = (preset || input).trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    const temporaryId = `six-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { role: "user", content: text },
      { id: temporaryId, role: "assistant", content: "", loading: true },
    ]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Ik kan je vraag momenteel niet beantwoorden.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Geen antwoord ontvangen.");
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.split("\n").find((entry) => entry.startsWith("data: "));
          if (!line) continue;
          const data = JSON.parse(line.slice(6)) as {
            text?: string;
            error?: string;
            conversationId?: string;
            messageId?: string;
            communityHref?: string | null;
          };
          if (data.error) throw new Error(data.error);
          if (data.conversationId) setConversationId(data.conversationId);
          if (data.text) fullText += data.text;
          setMessages((current) =>
            current.map((message) =>
              message.id === temporaryId
                ? {
                    ...message,
                    id: data.messageId || message.id,
                    content: fullText || message.content,
                    communityHref: data.communityHref ?? message.communityHref,
                    loading: false,
                  }
                : message
            )
          );
        }
      }
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === temporaryId
            ? {
                ...message,
                content: error instanceof Error ? error.message : "Er ging iets mis. Probeer het opnieuw.",
                loading: false,
              }
            : message
        )
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] right-3 z-[70] md:bottom-6 md:right-6">
      {open ? (
        <section className="flex h-[min(620px,calc(100vh-8rem))] w-[calc(100vw-1.5rem)] max-w-[390px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_90px_-30px_rgba(15,35,22,0.45)]">
          <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf3ee] text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-950">SIX</p>
              <p className="truncate text-[11px] text-slate-500">Antwoorden op basis van Sixtines kennis</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Chat sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#fafbfa] px-4 py-4">
            {messages.length === 0 ? (
              <div className="pt-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf3ee] text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-950">Hallo! Ik ben SIX 👋</p>
                <p className="mx-auto mt-1.5 max-w-[290px] text-xs leading-5 text-slate-500">
                  Stel gerust je vraag. Ik antwoord alleen met informatie die Sixtine eerder heeft gegeven.
                </p>
                <div className="mt-5 space-y-2 text-left">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => sendMessage(starter)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-xs text-slate-700 transition hover:border-primary/25 hover:bg-[#f5f8f5]"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-5 ${
                        message.role === "user"
                          ? "rounded-br-md bg-primary text-white"
                          : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {message.loading ? (
                        <span className="flex gap-1 text-slate-400"><i className="animate-pulse">●</i><i className="animate-pulse [animation-delay:150ms]">●</i><i className="animate-pulse [animation-delay:300ms]">●</i></span>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      {message.communityHref ? (
                        <Button asChild size="sm" variant="outline" className="mt-2 h-8 w-full gap-1 bg-white text-[11px]">
                          <Link href={message.communityHref} onClick={() => setOpen(false)}>
                            Stel je vraag in de community <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <footer className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Stel je vraag…"
                rows={1}
                className="max-h-24 min-h-10 resize-none rounded-xl border-slate-200 text-xs"
              />
              <Button
                type="button"
                size="icon"
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="h-10 w-10 shrink-0 rounded-xl"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[9px] text-slate-400">Persoonlijke of medische vragen worden doorgestuurd.</p>
          </footer>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex h-14 items-center gap-2.5 rounded-full bg-[#183d27] px-4 text-white shadow-[0_20px_45px_-18px_rgba(24,61,39,0.75)] transition hover:-translate-y-0.5 hover:bg-[#214f34]"
          aria-label="Open SIX chat"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="pr-1 text-xs font-semibold">Vraag het aan SIX</span>
        </button>
      )}
    </div>
  );
}
