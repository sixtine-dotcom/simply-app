"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UserRound } from "lucide-react";

export function ImpersonateUserButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleImpersonate = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kon de klantenomgeving niet openen");
      }

      window.location.href = data.redirectTo || "/";
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <Button type="button" onClick={handleImpersonate} disabled={disabled || isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <UserRound className="mr-2 h-4 w-4" />
      )}
      Open klantenomgeving
    </Button>
  );
}
