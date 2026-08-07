import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-background p-8 text-center shadow-card">
        <p className="font-display text-6xl font-light tracking-widest text-muted-foreground/40">
          404
        </p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          Pagina niet gevonden
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          De pagina die je zoekt bestaat niet of is verplaatst.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/">Naar dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/courses">Mijn cursussen</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
