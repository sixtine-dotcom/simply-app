"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessagesSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type SpaceOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type MembershipItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export function UserSpaceMembershipPanel({
  userId,
  spaces,
  memberships,
}: {
  userId: string;
  spaces: SpaceOption[];
  memberships: MembershipItem[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [spaceId, setSpaceId] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!spaceId) {
      toast({
        title: "Selecteer een community",
        description: "Kies eerst welke community je wilt toewijzen.",
        variant: "destructive",
      });
      return;
    }

    setBusyKey(`add:${spaceId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon communitytoegang niet geven");
      }

      toast({
        title: "Community toegevoegd",
        description: data.matchedExistingMembership
          ? "Dit lid had hier al toegang."
          : "Het lid ziet deze community nu in de omgeving.",
      });
      setSpaceId("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon communitytoegang niet geven",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setBusyKey(`remove:${memberId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}/spaces/${memberId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon communitytoegang niet intrekken");
      }

      toast({
        title: "Community verwijderd",
        description: "Deze toegang is ingetrokken.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description:
          error instanceof Error ? error.message : "Kon communitytoegang niet intrekken",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Communitytoegang beheren</p>
        <p className="text-xs text-muted-foreground">
          Voeg vanuit dit profiel meteen spaces toe of trek ze weer in.
        </p>
      </div>

      {spaces.length > 0 ? (
        <div className="flex gap-2">
          <select
            value={spaceId}
            onChange={(event) => setSpaceId(event.target.value)}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Selecteer community...</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name} {space.isActive ? "" : "· non-actief"}
              </option>
            ))}
          </select>
          <Button onClick={handleAdd} disabled={busyKey !== null}>
            {busyKey?.startsWith("add:") ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessagesSquare className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Maak eerst een community aan om die hier te kunnen toekennen.
        </p>
      )}

      {memberships.length > 0 ? (
        <div className="space-y-2">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{membership.name}</p>
                <p className="text-xs text-muted-foreground">
                  {membership.isActive ? "Actief" : "Non-actief"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void handleRemove(membership.id)}
                disabled={busyKey !== null}
              >
                {busyKey === `remove:${membership.id}` ? (
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
