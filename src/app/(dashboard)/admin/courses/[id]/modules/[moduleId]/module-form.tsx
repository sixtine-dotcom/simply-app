"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ModuleEditFormProps {
  courseId: string;
  moduleId: string;
  initialModule: {
    title: string;
    description: string | null;
    unlockAfterDays: number | null;
  };
}

export function ModuleEditForm({
  courseId,
  moduleId,
  initialModule,
}: ModuleEditFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState(initialModule.title);
  const [description, setDescription] = useState(initialModule.description ?? "");
  const [unlockAfterDays, setUnlockAfterDays] = useState(
    initialModule.unlockAfterDays ?? ""
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/modules/${moduleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            unlockAfterDays:
              unlockAfterDays === "" ? null : Number(unlockAfterDays),
          }),
        }
      );
      if (!res.ok) throw new Error("Opslaan mislukt");
      toast({ title: "Module opgeslagen" });
      router.refresh();
    } catch {
      toast({
        title: "Fout",
        description: "Kon module niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titel module</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beschrijving (optioneel)</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-h-[80px] p-3 rounded-md border bg-background text-sm"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="unlockAfterDays">Ontgrendel na X dagen (optioneel)</Label>
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
          X dagen na de startdatum van de inschrijving van de deelnemer wordt deze module zichtbaar. Cursus moet &quot;Dripping inschakelen&quot; hebben (dagen of weken).
        </p>
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
      </Button>
    </form>
  );
}
