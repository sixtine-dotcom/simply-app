"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useState } from "react";
import { Activity } from "lucide-react";

export function HealthProfileGate({
  isRequired,
}: {
  isRequired: boolean;
}) {
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    setPathname(window.location.pathname || "/");
  }, []);

  useEffect(() => {
    if (!isRequired) return;
    if (pathname.startsWith("/settings")) return;
    window.location.replace("/settings?focus=health-profile");
  }, [isRequired, pathname]);

  if (!isRequired || !pathname.startsWith("/settings")) {
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
        <Link className="font-medium underline underline-offset-4" href="/settings?focus=health-profile">
          Open profiel
        </Link>
      </div>
    </div>
  );
}
