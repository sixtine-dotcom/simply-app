"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function DeleteCourseButton({ courseId, courseTitle, redirectAfterDelete = false }: { courseId: string; courseTitle: string; redirectAfterDelete?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm(`Wil je “${courseTitle}” definitief verwijderen?`)) return;
    setLoading(true);
    const response = await fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast({ title: "Verwijderen niet mogelijk", description: data.error || "Probeer het opnieuw.", variant: "destructive" });
      return;
    }
    toast({ title: "Cursus verwijderd" });
    if (redirectAfterDelete) router.push("/admin/courses");
    router.refresh();
  }

  return (
    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-700" onClick={() => void remove()} disabled={loading} title="Cursus verwijderen" aria-label={`Verwijder ${courseTitle}`}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}
