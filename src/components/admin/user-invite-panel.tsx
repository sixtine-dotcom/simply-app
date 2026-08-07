"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export function UserInvitePanel({
  userId,
  email,
  lastLoginAt,
}: {
  userId: string;
  email: string;
  lastLoginAt: string | Date | null;
}) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const handleResend = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/invite`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon activatielink niet versturen");
      }

      setDevLink(data.devRegistrationLink || null);
      toast({
        title: "Activatielink verstuurd",
        description: data.message || `Nieuwe link verstuurd naar ${email}.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon activatielink niet versturen",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Accountactivatie</p>
        <p className="text-xs text-muted-foreground">
          {lastLoginAt
            ? "Dit lid heeft al eens ingelogd. Je kunt wel een nieuwe activatielink sturen."
            : "Dit lid heeft nog niet ingelogd. Stuur hier direct een activatielink opnieuw."}
        </p>
      </div>

      <Button onClick={handleResend} disabled={isSending} className="w-full">
        {isSending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Versturen...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Activatielink opnieuw sturen
          </>
        )}
      </Button>

      {devLink ? (
        <div className="rounded-xl border bg-background px-3 py-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Development link</p>
          <p className="mt-1 break-all">{devLink}</p>
        </div>
      ) : null}
    </div>
  );
}
