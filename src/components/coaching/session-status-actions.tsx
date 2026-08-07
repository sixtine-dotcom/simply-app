"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function SessionStatusActions({
  sessionId,
  status,
}: {
  sessionId: string;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const updateStatus = async (nextStatus: "scheduled" | "completed" | "cancelled") => {
    setLoadingAction(nextStatus);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Status kon niet worden bijgewerkt");
      }

      toast({
        title: "Sessie bijgewerkt",
        description: `Status gewijzigd naar ${nextStatus}.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Status kon niet worden bijgewerkt",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "completed" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void updateStatus("completed")}
          disabled={loadingAction !== null}
        >
          {loadingAction === "completed" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Markeer als afgerond
        </Button>
      ) : null}

      {status !== "cancelled" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void updateStatus("cancelled")}
          disabled={loadingAction !== null}
        >
          {loadingAction === "cancelled" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Annuleer sessie
        </Button>
      ) : null}

      {status !== "scheduled" ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => void updateStatus("scheduled")}
          disabled={loadingAction !== null}
        >
          {loadingAction === "scheduled" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Zet terug op gepland
        </Button>
      ) : null}
    </div>
  );
}
