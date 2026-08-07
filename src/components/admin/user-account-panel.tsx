"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const ROLE_OPTIONS = ["ADMIN", "COACH", "CLIENT", "SUPPORT"] as const;

export function UserAccountPanel({
  userId,
  currentUserId,
  role,
  phone,
  archivedAt,
}: {
  userId: string;
  currentUserId: string;
  role: string;
  phone: string | null;
  archivedAt: string | Date | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState(role);
  const [phoneValue, setPhoneValue] = useState(phone ?? "");
  const [busyAction, setBusyAction] = useState<"save" | "archive" | "restore" | null>(null);

  const handleSave = async () => {
    setBusyAction("save");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          phone: phoneValue || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon account niet bijwerken");
      }

      toast({
        title: "Account bijgewerkt",
        description: "Rol en contactgegevens zijn opgeslagen.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon account niet bijwerken",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleArchive = async () => {
    setBusyAction("archive");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon gebruiker niet archiveren");
      }

      toast({
        title: "Gebruiker gearchiveerd",
        description: "De gebruiker is uit de actieve peopleflow gehaald.",
      });
      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon gebruiker niet archiveren",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestore = async () => {
    setBusyAction("restore");
    try {
      const response = await fetch(`/api/admin/users/${userId}/restore`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Kon gebruiker niet herstellen");
      }

      toast({
        title: "Gebruiker hersteld",
        description: "De gebruiker staat terug in de actieve peopleflow.",
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon gebruiker niet herstellen",
        variant: "destructive",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Accountbeheer</p>
        <p className="text-xs text-muted-foreground">
          Pas rol en telefoon aan, of archiveer dit account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-role">Rol</Label>
        <select
          id="user-role"
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          disabled={busyAction !== null || userId === currentUserId || Boolean(archivedAt)}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="user-phone-edit">Telefoon</Label>
        <Input
          id="user-phone-edit"
          value={phoneValue}
          onChange={(event) => setPhoneValue(event.target.value)}
          placeholder="+32 4..."
          disabled={busyAction !== null || Boolean(archivedAt)}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={busyAction !== null || Boolean(archivedAt)}
        className="w-full"
      >
        {busyAction === "save" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opslaan...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-4 w-4" />
            Account opslaan
          </>
        )}
      </Button>

      {archivedAt ? (
        <Button
          variant="outline"
          onClick={handleRestore}
          disabled={busyAction !== null}
          className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        >
          {busyAction === "restore" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Herstellen...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Gebruiker herstellen
            </>
          )}
        </Button>
      ) : (
        <Button
          variant="outline"
          onClick={handleArchive}
          disabled={busyAction !== null || userId === currentUserId}
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
        >
          {busyAction === "archive" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Archiveren...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Gebruiker archiveren
            </>
          )}
        </Button>
      )}
    </div>
  );
}
