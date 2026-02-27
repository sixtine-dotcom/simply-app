"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  videoUrl: string | null;
  videoProvider: string | null;
  unlockAfterDays: number | null;
}

interface LessonEditFormProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialLesson: Lesson;
}

export function LessonEditForm({
  courseId,
  moduleId,
  lessonId,
  initialLesson,
}: LessonEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialLesson.title);
  const [content, setContent] = useState(initialLesson.content ?? "");
  const [videoUrl, setVideoUrl] = useState(initialLesson.videoUrl ?? "");
  const [unlockAfterDays, setUnlockAfterDays] = useState(
    initialLesson.unlockAfterDays ?? ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: content.trim() || null,
            videoUrl: videoUrl.trim() || null,
            videoProvider: videoUrl.includes("loom.com") ? "loom" : null,
            unlockAfterDays: unlockAfterDays === "" ? null : Number(unlockAfterDays),
          }),
        }
      );
      if (!res.ok) throw new Error("Opslaan mislukt");
      toast({ title: "Les opgeslagen" });
      router.refresh();
    } catch {
      toast({
        title: "Fout",
        description: "Kon les niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titel les</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Bijv. Introductie"
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl" className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          Loom video-URL
        </Label>
        <Input
          id="videoUrl"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.loom.com/share/xxxxxxxx"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Plak de &quot;Share&quot;-link van je Loom-video. Klanten zien de video embedded in de les.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Tekst onder de video (optioneel)</Label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Extra uitleg, opdrachten, downloads..."
          className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unlockAfterDays">Beschikbaar na X dagen (optioneel)</Label>
        <Input
          id="unlockAfterDays"
          type="number"
          min={0}
          value={unlockAfterDays}
          onChange={(e) => setUnlockAfterDays(e.target.value)}
          placeholder="Leeg = direct zichtbaar"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Laat leeg als de les direct beschikbaar is. Anders: aantal dagen na start inschrijving.
        </p>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Opslaan"
        )}
      </Button>
    </form>
  );
}
