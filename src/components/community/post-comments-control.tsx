"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function PostCommentsControl({ postId, closed, onChanged }: { postId: string; closed: boolean; onChanged?: (closed: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const label = closed ? "Reacties inschakelen" : "Reacties uitschakelen";
  return <Button type="button" variant="ghost" size="sm" className="h-9 gap-2 px-2 text-xs" aria-label={label} title={label} disabled={busy} onClick={async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commentsClosed: !closed }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Opslaan lukt niet. Probeer opnieuw.");
      onChanged?.(data.commentsClosed);
      toast({ title: data.commentsClosed ? "Reacties uitgeschakeld" : "Reacties ingeschakeld", description: data.commentsClosed ? "Bestaande reacties blijven zichtbaar. Nieuwe reacties zijn niet mogelijk." : "Leden kunnen weer reageren op dit bericht." });
      router.refresh();
    } catch (error) {
      toast({ title: "Instelling niet opgeslagen", description: error instanceof Error ? error.message : "Probeer het opnieuw.", variant: "destructive" });
    } finally { setBusy(false); }
  }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : closed ? <Unlock className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}<span className="hidden sm:inline">{label}</span></Button>;
}

export function CommentsClosedNotice() {
  return <p role="status" className="flex items-center gap-2 border-t border-black/10 px-1 py-4 text-xs leading-5 text-muted-foreground"><Lock className="h-4 w-4 shrink-0" aria-hidden="true" />Reacties zijn uitgeschakeld voor dit bericht.</p>;
}
