"use client";

import { useEffect, useRef, useState } from "react";
import { Heart, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIKE_EMOJI, REACTION_EMOJIS } from "@/lib/community-reactions";

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean;
}

interface ReactionBarProps {
  endpoint: string;
  initialReactions: ReactionSummary[];
  /** Toon een hartje om snel te liken als er nog geen ❤️ is. */
  showLikeShortcut?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ReactionBar({ endpoint, initialReactions, showLikeShortcut = false, size = "sm", className }: ReactionBarProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReactions(initialReactions);
  }, [initialReactions]);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setPickerOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const applyToggle = (list: ReactionSummary[], emoji: string): ReactionSummary[] => {
    const existing = list.find((reaction) => reaction.emoji === emoji);
    if (!existing) return [...list, { emoji, count: 1, reacted: true }];
    const count = existing.reacted ? existing.count - 1 : existing.count + 1;
    if (count <= 0) return list.filter((reaction) => reaction.emoji !== emoji);
    return list.map((reaction) => (reaction.emoji === emoji ? { ...reaction, count, reacted: !reaction.reacted } : reaction));
  };

  const toggle = async (emoji: string) => {
    if (pending) return;
    setPickerOpen(false);
    setPending(emoji);
    const previous = reactions;
    setReactions(applyToggle(reactions, emoji));
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (!response.ok) setReactions(previous);
    } catch {
      setReactions(previous);
    } finally {
      setPending(null);
    }
  };

  const hasLike = reactions.some((reaction) => reaction.emoji === LIKE_EMOJI);
  const pillHeight = size === "md" ? "!h-8" : "!h-7";
  const iconButton = size === "md" ? "!h-8 !w-8" : "!h-7 !w-7";

  return (
    <div ref={wrapperRef} className={cn("relative flex flex-wrap items-center gap-1.5", className)}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => void toggle(reaction.emoji)}
          aria-pressed={reaction.reacted}
          aria-label={`${reaction.emoji} ${reaction.count}`}
          className={cn(
            "inline-flex items-center gap-1 border px-2.5 text-xs font-semibold transition !min-h-0 !rounded-full",
            pillHeight,
            reaction.reacted
              ? "border-[#173622]/30 bg-[#edf3ee] text-[#173622]"
              : "border-black/10 bg-white text-[#4a524c] hover:border-black/20"
          )}
        >
          <span className="text-sm leading-none">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      {showLikeShortcut && !hasLike ? (
        <button
          type="button"
          onClick={() => void toggle(LIKE_EMOJI)}
          aria-label="Vind ik leuk"
          title="Vind ik leuk"
          className={cn("inline-flex items-center justify-center text-[#7a827c] transition hover:bg-[#f2f4f1] hover:text-red-500 !min-h-0 !rounded-full", iconButton)}
        >
          <Heart className="h-4 w-4" />
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        aria-label="Emoji toevoegen"
        aria-expanded={pickerOpen}
        title="Emoji toevoegen"
        className={cn("inline-flex items-center justify-center text-[#7a827c] transition hover:bg-[#f2f4f1] hover:text-[#173622] !min-h-0 !rounded-full", iconButton)}
      >
        <SmilePlus className="h-4 w-4" />
      </button>

      {pickerOpen ? (
        <div className="absolute left-0 top-full z-30 mt-2 grid grid-cols-6 gap-1 border border-black/10 bg-white p-2 shadow-[0_18px_45px_-24px_rgba(17,28,20,0.45)] !rounded-2xl">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => void toggle(emoji)}
              className="flex h-9 w-9 items-center justify-center text-xl transition hover:scale-110 hover:bg-[#f2f4f1] !min-h-0 !rounded-xl"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
