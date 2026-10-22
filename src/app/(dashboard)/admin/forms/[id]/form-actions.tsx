"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function FormActions({ formId, status }: { formId: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [action, setAction] = useState<string | null>(null);

  async function run(nextAction: "publish" | "archive" | "restore" | "duplicate") {
    setAction(nextAction);
    try {
      const response = await fetch(`/api/admin/forms/${formId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: nextAction }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "De actie is niet gelukt");
      if (nextAction === "duplicate") {
        toast({ title: "Formulier gedupliceerd", description: "De kopie staat als concept klaar voor een nieuwe challenge." });
        router.push(`/admin/forms/${result.form.id}?tab=assignments`);
      } else {
        toast({
          title: nextAction === "archive" ? "Formulier gearchiveerd" : "Formulier staat live",
          description: nextAction === "archive" ? "Je kunt het later opnieuw activeren." : "Actieve doelgroepen kunnen het formulier nu invullen.",
        });
        router.refresh();
      }
    } catch (error) {
      toast({ title: "Actie mislukt", description: error instanceof Error ? error.message : "Probeer het opnieuw.", variant: "destructive" });
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => void run("duplicate")} disabled={action !== null}>
        {action === "duplicate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
        Dupliceren
      </Button>
      {status === "DRAFT" ? (
        <Button onClick={() => void run("publish")} disabled={action !== null}>
          {action === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
          Formulier activeren
        </Button>
      ) : status === "ARCHIVED" ? (
        <Button onClick={() => void run("restore")} disabled={action !== null}>
          {action === "restore" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
          Opnieuw activeren
        </Button>
      ) : (
        <Button variant="outline" onClick={() => void run("archive")} disabled={action !== null}>
          {action === "archive" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
          Archiveren
        </Button>
      )}
    </div>
  );
}
