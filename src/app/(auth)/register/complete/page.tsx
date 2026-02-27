"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, User, XCircle, Phone } from "lucide-react";
import { Logo } from "@/components/layout/logo";

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"loading" | "form" | "submitting" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Geen link gevonden. Vraag een nieuwe aan op de registratiepagina.");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/register/complete?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setError(data.error || "Deze link is ongeldig of verlopen.");
          return;
        }

        setEmail(data.email || "");
        setStatus("form");
      } catch {
        setStatus("error");
        setError("Er is iets misgegaan. Probeer de link opnieuw.");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/auth/register/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          bio: bio.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("form");
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      router.push("/");
    } catch {
      setStatus("form");
      setError("Er is iets misgegaan. Probeer het opnieuw.");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
            <CardTitle className="font-display text-xl tracking-wider">EVEN GEDULD</CardTitle>
            <CardDescription>
              We controleren je link...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="font-display text-xl tracking-wider">LINK ONGELDIG</CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <Button asChild>
              <Link href="/register">Nieuwe link aanvragen</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">Naar inloggen</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo variant="auth" standalone />
          </div>
          <CardTitle className="font-display text-xl tracking-wider">ACCOUNT VOLTOOIEN</CardTitle>
          <CardDescription>
            Vul je gegevens in – we hebben je telefoonnummer nodig om je via WhatsApp te kunnen bereiken
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  readOnly
                  className="pl-10 bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefoonnummer *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+32 4XX XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                  disabled={status === "submitting"}
                />
              </div>
              <p className="text-xs text-muted-foreground">Voor contact via WhatsApp en soms wetjes</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Voornaam</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Je voornaam"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={status === "submitting"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Achternaam</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Je achternaam"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="pl-10"
                    required
                    disabled={status === "submitting"}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Korte beschrijving (optioneel)</Label>
              <textarea
                id="bio"
                placeholder="Stel jezelf kort voor"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[70px]"
                maxLength={500}
                disabled={status === "submitting"}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={status === "submitting"}>
              {status === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Account voltooien"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">Naar inloggen</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RegisterCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <CardTitle className="font-display text-xl tracking-wider">LADEN...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
