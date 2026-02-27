"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Send, Loader2, Mic } from "lucide-react";

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message.trim() }),
      });

      if (!response.ok) {
        throw new Error("Kon bericht niet versturen");
      }

      setMessage("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon bericht niet versturen",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Typ een bericht..."
            className="w-full resize-none border rounded-xl px-4 py-3 pr-12 min-h-[48px] max-h-32 focus:ring-2 focus:ring-primary focus:border-transparent"
            rows={1}
          />
          {/* Voice memo button (placeholder for future) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground"
            disabled
          >
            <Mic className="h-4 w-4" />
          </Button>
        </div>

        <Button 
          type="submit" 
          size="icon"
          disabled={!message.trim() || isSending}
          className="h-12 w-12 rounded-xl"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
