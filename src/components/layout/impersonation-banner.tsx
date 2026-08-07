"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";

type ImpersonationBannerProps = {
  adminName: string;
  adminEmail: string;
  targetEmail: string;
};

export function ImpersonationBanner({
  adminName,
  adminEmail,
  targetEmail,
}: ImpersonationBannerProps) {
  const [stopping, setStopping] = useState(false);

  const handleStop = async () => {
    setStopping(true);

    try {
      const response = await fetch("/api/auth/impersonation", {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kon support-sessie niet stoppen");
      }

      window.location.href = data.redirectTo || "/platform";
    } catch (error) {
      console.error(error);
      setStopping(false);
    }
  };

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5" />
          <div className="text-sm">
            <p className="font-medium">Support-impersonatie actief</p>
            <p className="text-amber-900/80">
              {adminName} ({adminEmail}) kijkt mee als {targetEmail}.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
          disabled={stopping}
          onClick={handleStop}
        >
          {stopping ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Stoppen...
            </>
          ) : (
            "Stop support-sessie"
          )}
        </Button>
      </div>
    </div>
  );
}
