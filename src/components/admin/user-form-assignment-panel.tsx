"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

type FormOption = {
  id: string;
  title: string;
  status: string;
};

type ExistingFormAssignment = {
  assignmentId: string;
  title: string;
  status: string;
  isRequired: boolean;
};

export function UserFormAssignmentPanel({
  userId,
  forms,
  assignments,
}: {
  userId: string;
  forms: FormOption[];
  assignments: ExistingFormAssignment[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [formId, setFormId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!formId) {
      toast({
        title: "Selecteer een formulier",
        description: "Kies eerst welk formulier je wilt toewijzen.",
        variant: "destructive",
      });
      return;
    }

    setBusyKey(`add:${formId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/forms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId,
          isRequired,
          dueAt: dueAt || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon formulier niet toewijzen");
      }

      toast({
        title: "Formulier toegewezen",
        description: data.matchedExistingAssignment
          ? "Dit formulier was al actief toegewezen aan dit lid."
          : "Het formulier staat nu direct op dit lidprofiel.",
      });
      setFormId("");
      setDueAt("");
      setIsRequired(true);
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon formulier niet toewijzen",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    setBusyKey(`remove:${assignmentId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/forms/${assignmentId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon formuliertoewijzing niet intrekken");
      }

      toast({
        title: "Formulier verwijderd",
        description: "Deze directe formuliertoewijzing is verwijderd.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon formuliertoewijzing niet intrekken",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (forms.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Maak eerst een formulier aan om het vanuit dit lidprofiel te kunnen toewijzen.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Formulier direct toewijzen</p>
        <p className="text-xs text-muted-foreground">
          Gebruik dit voor intake, opvolging of verplichte acties per lid.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-form-select">Formulier</Label>
        <select
          id="user-form-select"
          value={formId}
          onChange={(event) => setFormId(event.target.value)}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecteer formulier...</option>
          {forms.map((form) => (
            <option key={form.id} value={form.id}>
              {form.title} · {form.status.toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-form-due-date">Deadline</Label>
        <Input
          id="user-form-due-date"
          type="date"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isRequired}
          onChange={(event) => setIsRequired(event.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Verplicht maken
      </label>

      <Button onClick={handleAssign} disabled={busyKey !== null} className="w-full">
        {busyKey?.startsWith("add:") ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Toewijzen...
          </>
        ) : (
          <>
            <ClipboardList className="mr-2 h-4 w-4" />
            Formulier toewijzen
          </>
        )}
      </Button>

      {assignments.length > 0 ? (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.assignmentId}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{assignment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {assignment.status.toLowerCase()}
                  {assignment.isRequired ? " · verplicht" : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void handleRemove(assignment.assignmentId)}
                disabled={busyKey !== null}
              >
                {busyKey === `remove:${assignment.assignmentId}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
