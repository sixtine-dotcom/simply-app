"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function DuplicateCourseButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleDuplicate = async () => {
    const newTitle = window.prompt(
      "Nieuwe titel voor de kopie (bijv. Challenge 2). Laat leeg voor \"(kopie)\"."
    );
    if (newTitle === null) return; // cancelled
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newTitle: newTitle.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dupliceren mislukt");
      toast({ title: "Cursus gedupliceerd", description: data.title });
      router.push(`/admin/courses/${data.id}`);
      router.refresh();
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon niet dupliceren",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDuplicate}
      disabled={isLoading}
      title="Dupliceren (bijv. Challenge 2)"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}
