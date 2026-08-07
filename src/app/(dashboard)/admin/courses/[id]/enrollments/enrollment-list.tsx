"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Enrollment {
  id: string;
  startDate: Date;
  endDate: Date | null;
  user: User;
}

interface EnrollmentProgressSummary {
  overallPercent: number;
  modules: {
    moduleId: string;
    title: string;
    percent: number;
  }[];
}

export function EnrollmentList({
  courseId,
  enrollments,
  progressSummaryByEnrollment,
}: {
  courseId: string;
  enrollments: Enrollment[];
  progressSummaryByEnrollment: Record<string, EnrollmentProgressSummary>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const now = new Date();

  const handleUpdateEndDate = async (enrollmentId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/enrollments/${enrollmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endDate: endDate || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Mislukt");
      toast({ title: "Bijgewerkt" });
      setEditingId(null);
      setEndDate("");
      router.refresh();
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (enrollmentId: string) => {
    if (!confirm("Deelnemer uitschrijven? Ze verliezen toegang tot deze cursus.")) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/courses/${courseId}/enrollments/${enrollmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Mislukt");
      toast({ title: "Uitgeschreven" });
      router.refresh();
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (enrollments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nog geen deelnemers. Voeg e-mailadressen toe in het formulier links.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {enrollments.map((e) => {
        const expired = e.endDate && new Date(e.endDate) < now;
        const progress = progressSummaryByEnrollment[e.id];
        return (
          <div
            key={e.id}
            className="space-y-3 py-3 border-b last:border-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {e.user.firstName} {e.user.lastName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {e.user.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start: {formatDate(e.startDate)}
                  {e.endDate && (
                    <> · Eind: {formatDate(e.endDate)} {expired && "(afgelopen)"}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
              {editingId === e.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="datetime-local"
                    value={endDate}
                    onChange={(ev) => setEndDate(ev.target.value)}
                    className="w-40 text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleUpdateEndDate(e.id)}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Opslaan"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null);
                      setEndDate("");
                    }}
                  >
                    Annuleren
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(e.id);
                      setEndDate(e.endDate ? new Date(e.endDate).toISOString().slice(0, 16) : "");
                    }}
                    title="Einddatum bewerken"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(e.id)}
                    disabled={isLoading}
                    title="Uitschrijven"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
              </div>
            </div>

            {progress ? (
              <div className="rounded-2xl bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Effectief bekeken</span>
                  <span className="font-medium text-foreground">{progress.overallPercent}%</span>
                </div>
                <div className="space-y-2">
                  {progress.modules.map((module) => (
                    <div key={module.moduleId}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-muted-foreground">{module.title}</span>
                        <span className="font-medium">{module.percent}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${module.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
