"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const DURATION_OPTIONS = [
  { value: "15", label: "15 minuten" },
  { value: "30", label: "30 minuten" },
  { value: "45", label: "45 minuten" },
  { value: "60", label: "1 uur" },
  { value: "75", label: "1 uur 15 minuten" },
  { value: "90", label: "1 uur 30 minuten" },
  { value: "105", label: "1 uur 45 minuten" },
  { value: "120", label: "2 uur" },
  { value: "150", label: "2 uur 30 minuten" },
  { value: "180", label: "3 uur" },
];

function toLocalDateInputValue(date: Date | string) {
  const value = new Date(date);
  return value.toISOString().slice(0, 10);
}

function toLocalTimeInputValue(date: Date | string) {
  const value = new Date(date);
  return value.toISOString().slice(11, 16);
}

export function SessionEditForm({
  sessionId,
  title,
  description,
  scheduledAt,
  duration,
}: {
  sessionId: string;
  title: string | null;
  description?: string | null;
  scheduledAt: Date | string;
  duration: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: title ?? "",
    description: description ?? "",
    scheduledDate: toLocalDateInputValue(scheduledAt),
    scheduledTime: toLocalTimeInputValue(scheduledAt),
    duration: String(duration),
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const scheduledAtIso = new Date(
        `${formData.scheduledDate}T${formData.scheduledTime}`
      ).toISOString();

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim() || null,
          description: formData.description.trim() || null,
          scheduledAt: scheduledAtIso,
          duration: Number(formData.duration),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kon sessie niet opslaan");
      }

      toast({
        title: "Sessie bijgewerkt",
        description: "Planning en details zijn opgeslagen.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon sessie niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-muted/15 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Planning bewerken</p>
        <p className="text-xs text-muted-foreground">
          Pas titel, tijdstip en duur van deze sessie aan.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="session-description">Beschrijving</Label>
        <Textarea
          id="session-description"
          value={formData.description}
          onChange={(event) =>
            setFormData((current) => ({ ...current, description: event.target.value }))
          }
          rows={4}
          placeholder="Agenda, voorbereiding of aandachtspunten..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="session-title">Titel</Label>
        <Input
          id="session-title"
          value={formData.title}
          onChange={(event) =>
            setFormData((current) => ({ ...current, title: event.target.value }))
          }
          placeholder="bijv. Intake sessie"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="session-date">Datum</Label>
          <Input
            id="session-date"
            type="date"
            value={formData.scheduledDate}
            onChange={(event) =>
              setFormData((current) => ({ ...current, scheduledDate: event.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="session-time">Tijd</Label>
          <Input
            id="session-time"
            type="time"
            value={formData.scheduledTime}
            onChange={(event) =>
              setFormData((current) => ({ ...current, scheduledTime: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="session-duration">Duur</Label>
        <select
          id="session-duration"
          value={formData.duration}
          onChange={(event) =>
            setFormData((current) => ({ ...current, duration: event.target.value }))
          }
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opslaan...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Wijzigingen opslaan
          </>
        )}
      </Button>
    </div>
  );
}
