"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface PostPollProps {
  postId: string;
  question: string;
  options: Array<{
    index: number;
    label: string;
    votes: number;
  }>;
  totalVotes: number;
  userVote: number | null;
}

export function PostPoll({
  postId,
  question,
  options,
  totalVotes,
  userVote,
}: PostPollProps) {
  const { toast } = useToast();
  const [selectedVote, setSelectedVote] = useState<number | null>(userVote);
  const [pollOptions, setPollOptions] = useState(options);
  const [submitting, setSubmitting] = useState(false);

  const submitVote = async (optionIndex: number) => {
    if (submitting) return;

    const previousVote = selectedVote;
    const nextOptions = pollOptions.map((option) => {
      let votes = option.votes;
      if (previousVote === option.index) votes -= 1;
      if (option.index === optionIndex) votes += 1;
      return { ...option, votes };
    });

    setSelectedVote(optionIndex);
    setPollOptions(nextOptions);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Stemmen mislukt");
      }

      if (result.post?.poll) {
        setSelectedVote(result.post.poll.userVote);
        setPollOptions(result.post.poll.options);
      }
    } catch (error) {
      setSelectedVote(previousVote);
      setPollOptions(options);
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Stemmen mislukt",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentTotalVotes = pollOptions.reduce((sum, option) => sum + option.votes, 0) || totalVotes;

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <p className="mb-3 font-medium text-foreground">{question}</p>
      <div className="space-y-2">
        {pollOptions.map((option) => {
          const percentage = currentTotalVotes > 0 ? Math.round((option.votes / currentTotalVotes) * 100) : 0;
          const isSelected = selectedVote === option.index;

          return (
            <button
              key={option.index}
              type="button"
              onClick={() => void submitVote(option.index)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition-colors",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:border-primary/30"
              )}
            >
              <span
                className="absolute inset-y-0 left-0 bg-primary/10"
                style={{ width: `${percentage}%` }}
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="font-medium text-foreground">{option.label}</span>
                <span className="text-sm text-muted-foreground">
                  {submitting && isSelected ? <Loader2 className="h-4 w-4 animate-spin" /> : `${option.votes} • ${percentage}%`}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {currentTotalVotes} stem{currentTotalVotes === 1 ? "" : "men"}
      </p>
    </div>
  );
}
