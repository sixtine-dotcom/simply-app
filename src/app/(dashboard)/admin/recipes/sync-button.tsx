"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react";

export function RecipeSyncButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ created: number; updated: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const sync = async () => {
    setState("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/recipes/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Sync mislukt");

      setResult(data);
      setState("done");
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sync mislukt");
      setState("error");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={() => void sync()}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
        ) : (
          <RefreshCw className="mr-2 h-4 w-4" />
        )}
        {state === "loading"
          ? "Bezig met synchroniseren…"
          : "Sync van website"}
      </Button>

      {state === "done" && result && (
        <p className="text-xs text-emerald-600">
          ✓ {result.total} recepten — {result.created} nieuw, {result.updated} bijgewerkt
        </p>
      )}
      {state === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
