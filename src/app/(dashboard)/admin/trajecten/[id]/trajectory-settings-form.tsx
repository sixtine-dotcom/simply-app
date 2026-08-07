"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function inputDate(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function TrajectorySettingsForm({
  courseId,
  startDate,
  endDate,
}: {
  courseId: string;
  startDate: string | null;
  endDate: string | null;
}) {
  const router = useRouter();
  const [start, setStart] = useState(inputDate(startDate));
  const [end, setEnd] = useState(inputDate(endDate));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (start && end && end < start) {
      setMessage("De einddatum moet na de startdatum liggen.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/admin/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trajectoryStartDate: start ? `${start}T00:00:00.000Z` : null,
        trajectoryEndDate: end ? `${end}T23:59:59.999Z` : null,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error || "Opslaan is niet gelukt.");
      return;
    }
    setMessage("Planning opgeslagen.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          Startdatum
          <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Einddatum
          <Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Opslaan…" : "Planning opslaan"}</Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </form>
  );
}
