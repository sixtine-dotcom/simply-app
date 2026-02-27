"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface LessonCompleteButtonProps {
  lessonId: string;
  isCompleted: boolean;
}

export function LessonCompleteButton({ lessonId, isCompleted: initialCompleted }: LessonCompleteButtonProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isLoading, setIsLoading] = useState(false);

  const toggleComplete = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !isCompleted }),
      });

      if (response.ok) {
        setIsCompleted(!isCompleted);
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to update progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isCompleted ? "outline" : "default"}
      onClick={toggleComplete}
      disabled={isLoading}
      className="min-w-[200px]"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isCompleted ? (
        <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
      ) : (
        <Circle className="h-4 w-4 mr-2" />
      )}
      {isCompleted ? "Voltooid" : "Markeer als voltooid"}
    </Button>
  );
}
