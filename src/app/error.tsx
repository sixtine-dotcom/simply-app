"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-background p-8 text-center shadow-card">
        <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Simply leeromgeving</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Er ging iets mis</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          De pagina kon niet correct geladen worden. Probeer opnieuw of keer terug naar het platform.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Opnieuw proberen</Button>
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            Naar home
          </Button>
        </div>
      </div>
    </div>
  );
}
