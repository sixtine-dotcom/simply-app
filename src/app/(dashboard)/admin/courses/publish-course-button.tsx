"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function PublishCourseButton({ courseId, isPublished, iconOnly = false }: { courseId: string; isPublished: boolean; iconOnly?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function togglePublish() {
    setLoading(true);
    const response = await fetch(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !isPublished }),
    });
    setLoading(false);
    if (!response.ok) {
      toast({ title: "Status aanpassen mislukt", variant: "destructive" });
      return;
    }
    toast({ title: isPublished ? "Cursus staat niet langer gepubliceerd" : "Cursus is gepubliceerd" });
    router.refresh();
  }

  return (
    <Button type="button" size={iconOnly ? "icon" : "sm"} variant={iconOnly ? "outline" : isPublished ? "outline" : "default"} className={iconOnly ? "h-8 w-8 rounded-full text-muted-foreground" : "h-8 px-2.5 text-xs"} onClick={() => void togglePublish()} disabled={loading} title={isPublished ? "Publicatie stoppen" : "Publiceren"} aria-label={isPublished ? "Publicatie stoppen" : "Publiceren"}>
      {loading ? <Loader2 className={iconOnly ? "h-3.5 w-3.5 animate-spin" : "mr-1.5 h-3.5 w-3.5 animate-spin"} /> : iconOnly ? <Megaphone className="h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
      {iconOnly ? null : isPublished ? "Publicatie stoppen" : "Publiceren"}
    </Button>
  );
}
