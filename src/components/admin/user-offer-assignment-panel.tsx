"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

type OfferOption = {
  id: string;
  title: string;
  isPublished: boolean;
};

type ExistingOfferAssignment = {
  assignmentId: string;
  offerId: string;
  title: string;
  isPublished: boolean;
};

export function UserOfferAssignmentPanel({
  userId,
  offers,
  assignments,
}: {
  userId: string;
  offers: OfferOption[];
  assignments: ExistingOfferAssignment[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [offerId, setOfferId] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!offerId) {
      toast({
        title: "Selecteer een offer",
        description: "Kies eerst welk offer je wilt toekennen.",
        variant: "destructive",
      });
      return;
    }

    setBusyKey(`add:${offerId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ offerId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon offer niet toekennen");
      }

      toast({
        title: "Offer toegekend",
        description: data.matchedExistingAssignment
          ? "Deze gebruiker had dit offer al actief."
          : "Toegang en gekoppelde cursusinschrijvingen zijn toegevoegd.",
      });
      setOfferId("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon offer niet toekennen",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRevoke = async (assignmentId: string, targetOfferId: string) => {
    setBusyKey(`remove:${assignmentId}`);
    try {
      const response = await fetch(
        `/api/admin/offers/${targetOfferId}/assignments/${assignmentId}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon offertoegang niet intrekken");
      }

      toast({
        title: "Offer ingetrokken",
        description: "Toegang en gekoppelde cursusinschrijvingen zijn ingetrokken.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon offertoegang niet intrekken",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Maak eerst een offer aan om toegang vanuit dit lidprofiel te kunnen geven.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Nieuw offer toekennen</p>
        <p className="text-xs text-muted-foreground">
          Geef vanuit dit profiel direct toegang tot een membership of programma.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-offer-select">Offer</Label>
        <select
          id="user-offer-select"
          value={offerId}
          onChange={(event) => setOfferId(event.target.value)}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Selecteer offer...</option>
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.title} {offer.isPublished ? "· live" : "· draft"}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={handleAssign} disabled={busyKey !== null} className="w-full">
        {busyKey?.startsWith("add:") ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Toekennen...
          </>
        ) : (
          <>
            <Gift className="mr-2 h-4 w-4" />
            Offer toekennen
          </>
        )}
      </Button>

      {assignments.length > 0 ? (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.assignmentId}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{assignment.title}</p>
                <p className="text-xs text-muted-foreground">
                  {assignment.isPublished ? "Live" : "Draft"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void handleRevoke(assignment.assignmentId, assignment.offerId)}
                disabled={busyKey !== null}
              >
                {busyKey === `remove:${assignment.assignmentId}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
