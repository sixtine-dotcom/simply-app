"use client";

import { useCurrentUserContext } from "@/components/layout/current-user-provider";

export function useCurrentUserSummary() {
  return useCurrentUserContext();
}
