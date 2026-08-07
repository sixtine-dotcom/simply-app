"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useState } from "react";
import { ClipboardList } from "lucide-react";

export function FormCompletionGate({
  pendingFormHref,
  pendingFormTitle,
}: {
  pendingFormHref: string | null;
  pendingFormTitle: string | null;
}) {
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    setPathname(window.location.pathname || "/");
  }, []);

  useEffect(() => {
    if (!pendingFormHref) return;
    if (pathname.startsWith("/settings")) return;
    if (pathname.startsWith("/forms")) return;
    window.location.replace(pendingFormHref);
  }, [pathname, pendingFormHref]);

  if (!pendingFormHref || !pathname.startsWith("/forms")) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          <p>
            Vul eerst <span className="font-medium">{pendingFormTitle || "je verplichte formulier"}</span> in
            voor je verdergaat in het platform.
          </p>
        </div>
        <Link className="font-medium underline underline-offset-4" href={pendingFormHref}>
          Open formulier
        </Link>
      </div>
    </div>
  );
}
