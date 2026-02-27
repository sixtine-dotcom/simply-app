"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostLikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function PostLikeButton({ postId, initialLiked, initialCount }: PostLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const response = await fetch(`/api/community/posts/${postId}/like`, {
        method: "POST",
      });

      if (!response.ok) {
        // Revert on error
        setIsLiked(wasLiked);
        setLikeCount(initialCount);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount(initialCount);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLiking}
      className={cn(
        "flex items-center gap-2 text-sm transition-colors",
        isLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
      )}
    >
      <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
      <span>{likeCount} {likeCount === 1 ? "like" : "likes"}</span>
    </button>
  );
}
