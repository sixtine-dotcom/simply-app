"use client";

import { useMemo, useRef, useState } from "react";
import { VideoPlayer } from "@/components/courses/video-player";

type LessonVideoBlockProps = {
  lessonId: string;
  url: string;
  provider: string | null;
  initialProgress: number;
  videoDuration: number | null;
};

export function LessonVideoBlock({
  lessonId,
  url,
  provider,
  initialProgress,
  videoDuration,
}: LessonVideoBlockProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [duration, setDuration] = useState(videoDuration ?? 0);
  const lastSavedRef = useRef(initialProgress);

  const remainingLabel = useMemo(() => {
    if (!duration || progress <= 0 || progress >= duration - 10) {
      return null;
    }

    return formatRemaining(duration - progress);
  }, [duration, progress]);

  const saveProgress = async (seconds: number, nextDuration?: number) => {
    const normalizedSeconds = Math.max(0, Math.floor(seconds));
    const normalizedDuration = nextDuration ? Math.max(0, Math.floor(nextDuration)) : duration;
    setProgress(normalizedSeconds);
    if (normalizedDuration) setDuration(normalizedDuration);

    if (Math.abs(normalizedSeconds - lastSavedRef.current) < 10 && normalizedSeconds !== normalizedDuration) {
      return;
    }

    lastSavedRef.current = normalizedSeconds;
    await fetch(`/api/courses/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoProgress: normalizedSeconds,
        videoDuration: normalizedDuration || undefined,
      }),
    });
  };

  const saveDuration = async (nextDuration: number) => {
    const normalizedDuration = Math.max(1, Math.floor(nextDuration));
    setDuration(normalizedDuration);

    if (duration === normalizedDuration) {
      return;
    }

    await fetch(`/api/courses/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoDuration: normalizedDuration }),
    });
  };

  const markComplete = async (nextDuration?: number) => {
    const normalizedDuration = nextDuration || duration || progress;
    setProgress(normalizedDuration);

    await fetch(`/api/courses/lessons/${lessonId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed: true,
        videoProgress: normalizedDuration,
        videoDuration: normalizedDuration || undefined,
      }),
    });
  };

  return (
    <div>
      {remainingLabel ? (
        <div className="border-b border-stone-800 bg-stone-950 px-4 py-3 text-sm text-stone-200">
          Je bent gebleven op {formatTimestamp(progress)}. Nog {remainingLabel} te bekijken.
        </div>
      ) : null}
      <VideoPlayer
        url={url}
        provider={provider}
        initialProgress={initialProgress}
        onDuration={(nextDuration) => void saveDuration(nextDuration)}
        onProgress={(seconds, nextDuration) => void saveProgress(seconds, nextDuration)}
        onComplete={(nextDuration) => void markComplete(nextDuration)}
      />
    </div>
  );
}

function formatTimestamp(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatRemaining(seconds: number) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? "1 minuut" : `${minutes} minuten`;
}
