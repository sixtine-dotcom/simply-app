"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchCurrentUserSummary } from "@/lib/current-user";
import type { CurrentUserSummary } from "@/lib/current-user";

interface CurrentUserContextValue {
  user: CurrentUserSummary | null;
  refreshUser: () => Promise<CurrentUserSummary | null>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: CurrentUserSummary | null;
}) {
  const [user, setUser] = useState<CurrentUserSummary | null>(initialUser);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      refreshUser: async () => {
        const nextUser = await fetchCurrentUserSummary();
        setUser(nextUser);
        return nextUser;
      },
    }),
    [user]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUserContext() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUserContext must be used within CurrentUserProvider");
  }

  return context;
}
