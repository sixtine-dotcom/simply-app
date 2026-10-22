import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIDEO_STATUS_LABELS, VideoProjectStatus, VideoStep } from "@/lib/video-studio-shared";

const STATUS_STYLES: Record<VideoProjectStatus, string> = {
  WAITING_FOR_FOOTAGE: "bg-slate-100 text-slate-700",
  PROCESSING: "bg-amber-100 text-amber-800",
  READY_FOR_REVIEW: "bg-emerald-100 text-emerald-800",
  APPLYING_FEEDBACK: "bg-amber-100 text-amber-800",
  APPROVED: "bg-[#385739] text-white",
  FAILED: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: VideoProjectStatus }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLES[status] ?? STATUS_STYLES.WAITING_FOR_FOOTAGE)}>
      {VIDEO_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function StepBar({ steps, compact = false }: { steps: VideoStep[]; compact?: boolean }) {
  if (steps.length === 0) return null;
  return (
    <ol className={cn("flex flex-wrap items-center", compact ? "gap-1" : "gap-2")}>
      {steps.map((step, index) => (
        <li key={step.key} className="flex items-center gap-1" title={step.message || step.label}>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border",
              compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
              step.status === "done" && "border-emerald-200 bg-emerald-50 text-emerald-800",
              step.status === "running" && "border-amber-200 bg-amber-50 text-amber-800",
              step.status === "failed" && "border-red-200 bg-red-50 text-red-700",
              step.status === "pending" && "border-slate-200 bg-white text-slate-500"
            )}
          >
            {step.status === "done" ? <Check className="h-3 w-3" /> : null}
            {step.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {step.status === "failed" ? <X className="h-3 w-3" /> : null}
            {step.label}
          </span>
          {index < steps.length - 1 && !compact ? <span className="text-slate-300">→</span> : null}
        </li>
      ))}
    </ol>
  );
}
