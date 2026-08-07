"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Pin, PinOff } from "lucide-react";

export function PinToggleButton({
  postId,
  initialPinned,
}: {
  postId: string;
  initialPinned: boolean;
}) {
  const router = useRouter();
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const nextValue = !isPinned;
    setIsPinned(nextValue);

    try {
      const response = await fetch(`/api/community/posts/${postId}/pin`, {
        method: "PATCH",
      });

      if (!response.ok) {
        setIsPinned(!nextValue);
        return;
      }

      router.refresh();
    } catch (error) {
      setIsPinned(!nextValue);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 gap-1 px-2 text-xs"
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isPinned ? (
        <PinOff className="h-3.5 w-3.5" />
      ) : (
        <Pin className="h-3.5 w-3.5" />
      )}
      {isPinned ? "Unpin" : "Pin"}
    </Button>
  );
}
