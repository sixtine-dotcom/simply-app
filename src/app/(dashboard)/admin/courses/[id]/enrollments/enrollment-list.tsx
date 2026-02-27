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

export function EnrollmentList({
  courseId,
  enrollments,
}: {
  courseId: string;
  enrollments: Enrollment[];
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
        return (
          <div
            key={e.id}
            className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
          >
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
        );
      })}
    </div>
  );
}
