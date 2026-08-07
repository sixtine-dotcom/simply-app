"use client";

import { useEffect, useState } from "react";
import { ClerkAuthControls } from "@/components/layout/clerk-auth-controls";

const HIDDEN_ON_PATHS = ["/login", "/sign-up"];

export function GlobalAuthHeader() {
  const [pathname, setPathname] = useState("/");

  useEffect(() => {
    setPathname(window.location.pathname || "/");
  }, []);

  const shouldHide = HIDDEN_ON_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (shouldHide) return null;

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-end gap-3 px-4">
        <ClerkAuthControls />
      </div>
    </header>
  );
}
