"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { TenantBranding } from "@/lib/branding";

const BrandingContext = createContext<TenantBranding | null>(null);

export function BrandingProvider({
  children,
  branding,
}: {
  children: ReactNode;
  branding: TenantBranding;
}) {
  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const branding = useContext(BrandingContext);

  if (!branding) {
    throw new Error("useBranding must be used within BrandingProvider");
  }

  return branding;
}
