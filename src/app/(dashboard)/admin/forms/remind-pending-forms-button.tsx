"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function RemindPendingFormsButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/forms/remind-pending", {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Kon formulierherinneringen niet versturen");
      }

      toast({
        title: "Follow-up verwerkt",
        description: result.message || "Open formulieren zijn opgevolgd.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error
            ? error.message
            : "Kon formulierherinneringen niet versturen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Versturen...
        </>
      ) : (
        <>
          <Mail className="mr-2 h-4 w-4" />
          Herinner open formulieren
        </>
      )}
    </Button>
  );
}
