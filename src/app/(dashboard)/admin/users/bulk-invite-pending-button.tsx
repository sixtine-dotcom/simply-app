"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function BulkInvitePendingButton({
  pendingCount,
}: {
  pendingCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users/invite-pending", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Kon activatielinks niet opnieuw versturen");
      }

      toast({
        title: "Activatielinks verwerkt",
        description: data.message || "Open activaties zijn opnieuw verstuurd.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error
            ? error.message
            : "Kon activatielinks niet opnieuw versturen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading || pendingCount === 0}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Versturen...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Verstuur open activaties
        </>
      )}
    </Button>
  );
}
