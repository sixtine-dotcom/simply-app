"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type LessonChecklistProps = {
  lessonId: string;
  title: string;
  items: string[];
  initialState: Record<string, boolean>;
  saveProgress?: boolean;
};

export function LessonChecklist({
  lessonId,
  title,
  items,
  initialState,
  saveProgress = true,
}: LessonChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>(initialState);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completedCount = useMemo(
    () => items.reduce((total, _item, index) => total + (checked[String(index)] ? 1 : 0), 0),
    [checked, items]
  );

  const toggleItem = async (index: number) => {
    const key = String(index);
    const next = {
      ...checked,
      [key]: !checked[key],
    };
    setChecked(next);
    setSavingIndex(index);
    setError(null);

    if (!saveProgress) {
      setSavingIndex(null);
      return;
    }

    try {
      const response = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistState: next }),
      });
      if (!response.ok) {
        throw new Error("Checklist opslaan mislukt");
      }
    } catch (error) {
      setChecked(checked);
      setError("Kon je vinkje niet opslaan. Probeer opnieuw.");
      console.error("Failed to update checklist:", error);
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="space-y-4 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_20px_65px_-50px_rgba(0,0,0,0.35)] md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
        <p className="text-sm text-stone-500">
          {completedCount}/{items.length} afgevinkt
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => {
          const isChecked = Boolean(checked[String(index)]);

          return (
            <button
              key={`${item}-${index}`}
              type="button"
              onClick={() => void toggleItem(index)}
              aria-pressed={isChecked}
              className={cn(
                "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30",
                isChecked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-stone-200 bg-stone-50 text-stone-800 hover:border-primary/30 hover:bg-white",
                savingIndex === index && "opacity-70"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition",
                  isChecked
                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                    : "border-stone-300 bg-white text-transparent"
                )}
              >
                <Check className="h-4 w-4" />
              </span>
              <span className={cn(isChecked && "line-through decoration-emerald-700/50")}>{item}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
