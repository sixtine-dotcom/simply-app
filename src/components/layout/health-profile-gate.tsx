"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react";

export function HealthProfileGate({
  isRequired,
  isBlockedByRequiredForm = false,
}: {
  isRequired: boolean;
  isBlockedByRequiredForm?: boolean;
}) {
  const pathname = usePathname();

  if (!isRequired || isBlockedByRequiredForm) {
    return null;
  }

  return (
    <div className="border-b border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-950 backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <p>
            Vul eerst je <span className="font-medium">gezondheidsprofiel</span> in zodat het platform je kcal- en macrodoelen kan berekenen.
          </p>
        </div>
        <Link className="shrink-0 font-medium underline underline-offset-4" href="/settings?focus=health-profile">
          {pathname.startsWith("/settings") ? "Profiel invullen" : "Open profiel"}
        </Link>
      </div>
    </div>
  );
}
