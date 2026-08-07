"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserPlus } from "lucide-react";

export function AddUserForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"CLIENT" | "COACH" | "ADMIN" | "SUPPORT">("CLIENT");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    message: string;
    devRegistrationLink?: string | null;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Er is iets misgegaan");
        return;
      }
      setSuccess({
        message: data.message || "Gebruiker toegevoegd.",
        devRegistrationLink: data.devRegistrationLink || null,
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("CLIENT");
      router.refresh();
    } catch {
      setError("Er is iets misgegaan");
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Gebruiker toevoegen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className={embedded ? "grid gap-5 sm:grid-cols-2" : "grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5"}
        >
          <div className={embedded ? "space-y-2 sm:col-span-2" : "space-y-2"}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">Voornaam</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Voornaam"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Achternaam</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Achternaam"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={isLoading}
            >
              <option value="CLIENT">Klant</option>
              <option value="COACH">Coach</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPPORT">Support</option>
            </select>
          </div>
          <Button type="submit" disabled={isLoading} className={embedded ? "sm:col-span-2 sm:justify-self-end" : undefined}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Toevoegen"}
          </Button>
        </form>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        {success && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p>{success.message}</p>
            {success.devRegistrationLink ? (
              <a
                href={success.devRegistrationLink}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-green-900 underline underline-offset-4"
              >
                Open activatielink
              </a>
            ) : null}
          </div>
        )}
      </CardContent>
    </>
  );

  return embedded ? <div>{content}</div> : <Card>{content}</Card>;
}
