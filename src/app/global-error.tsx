"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="nl">
      <body className="bg-muted/30">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-border bg-background p-8 text-center shadow-card">
            <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Simply leeromgeving</p>
            <h1 className="mt-4 text-2xl font-semibold text-foreground">De applicatie moet herladen</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Er is een globale fout opgetreden tijdens het laden. Herlaad de pagina of probeer opnieuw.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
