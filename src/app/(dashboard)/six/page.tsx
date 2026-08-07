"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, ThumbsUp, ThumbsDown, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  feedback?: string | null;
  isStreaming?: boolean;
};

const SUGGESTED_QUESTIONS = [
  "Vat mijn huidige les kort samen.",
  "Wat zijn mijn belangrijkste actiepunten deze week?",
  "Welke vraag kan ik hierover aan mijn coach stellen?",
  "Leg dit eenvoudiger uit met een praktisch voorbeeld.",
];

export default function SixPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setIsLoading(true);

    const assistantId = `streaming-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, conversationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Er is iets misgegaan. Probeer het opnieuw.");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let finalConversationId = conversationId;
      let finalMessageId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let data: {
            text?: string;
            error?: string;
            conversationId?: string;
            messageId?: string;
          };
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (data.text) {
            fullText += data.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: fullText }
                  : m
              )
            );
          }
          if (data.error) {
            throw new Error(data.error);
          }
          if (data.conversationId) {
            finalConversationId = data.conversationId;
            setConversationId(data.conversationId);
          }
          if (data.messageId) finalMessageId = data.messageId;
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, id: finalMessageId, isStreaming: false }
            : m
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Er is iets misgegaan. Probeer het opnieuw.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: errorMessage,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function sendFeedback(messageId: string, feedback: "positive" | "negative") {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, feedback } : m))
    );
    await fetch("/api/ai/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, feedback }),
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setInput("");
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-wider text-foreground md:text-2xl">
              SIX AI
            </h1>
            <p className="text-xs text-muted-foreground">Jouw persoonlijke gezondheidsassistent</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={startNewChat} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Nieuw gesprek
          </Button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border bg-background/50">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-lg tracking-wider text-foreground">
              Hallo! Ik ben SIX 👋
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Stel me een vraag over je lessen, opdrachten, voeding, beweging of het Simply programma.
              Ik denk met je mee binnen de richtlijnen van je coach.
            </p>

            <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl border bg-background p-3 text-left text-sm text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-4 md:p-6">
            {messages.map((message, i) => (
              <div
                key={i}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.isStreaming && message.content === "" ? (
                    <span className="flex gap-1">
                      <span className="animate-bounce">•</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>•</span>
                    </span>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}

                  {/* Feedback buttons for assistant messages */}
                  {message.role === "assistant" &&
                    !message.isStreaming &&
                    message.content &&
                    message.id && (
                      <div className="mt-2 flex gap-1">
                        <button
                          onClick={() => sendFeedback(message.id!, "positive")}
                          className={`rounded p-1 transition ${
                            message.feedback === "positive"
                              ? "text-green-600"
                              : "text-muted-foreground hover:text-green-600"
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => sendFeedback(message.id!, "negative")}
                          className={`rounded p-1 transition ${
                            message.feedback === "negative"
                              ? "text-red-500"
                              : "text-muted-foreground hover:text-red-500"
                          }`}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="mt-3 flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stel een vraag aan SIX... (Enter om te sturen)"
          className="min-h-[52px] max-h-[200px] resize-none rounded-2xl"
          rows={1}
          disabled={isLoading}
        />
        <Button
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          size="icon"
          className="h-[52px] w-[52px] flex-shrink-0 rounded-2xl"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        SIX AI kan fouten maken. Raadpleeg bij twijfel een professional.
      </p>
    </div>
  );
}
