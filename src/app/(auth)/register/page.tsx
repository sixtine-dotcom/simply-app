"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState<"client" | "tenant_admin">("client");
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setDevMagicLink(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          accountType,
          tenantName: accountType === "tenant_admin" ? tenantName.trim() : undefined,
          tenantSlug: accountType === "tenant_admin" ? tenantSlug.trim() : undefined,
        }),
      });

      let data: { success?: boolean; error?: string; existingAccount?: boolean; devMagicLink?: string };
      try {
        data = await response.json();
      } catch {
        setError("Server gaf geen geldig antwoord. Controleer of de database draait (bijv. Docker).");
        return;
      }

      if (!response.ok) {
        if (data.existingAccount) {
          router.push("/login?message=existing");
          return;
        }
        setError(data.error || "Er is iets misgegaan");
        return;
      }

      if (data.devMagicLink) {
        setDevMagicLink(data.devMagicLink);
      }
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is iets misgegaan");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28)), url('/auth-login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Card className="w-full max-w-md border-border bg-white shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="font-display text-2xl tracking-wider">
              {devMagicLink ? "GEBRUIK ONDERSTAANDE LINK" : "CHECK JE INBOX"}
            </CardTitle>
            <CardDescription className="mt-2">
              {devMagicLink
                ? "De email kon niet worden verstuurd (Resend niet geconfigureerd). Klik op de link hieronder om je account te voltooien."
                : <>We hebben een link gestuurd naar <strong>{email}</strong>. Klik op de link om je account te voltooien met je naam. De link is 7 dagen geldig.</>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {devMagicLink && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">Klik op deze link om je account te voltooien:</p>
                <a
                  href={devMagicLink}
                  className="text-sm text-primary hover:underline break-all"
                >
                  {devMagicLink}
                </a>
                <p className="text-xs text-muted-foreground mt-2">Klik op de link om je account te voltooien.</p>
              </div>
            )}
            <div className="text-center">
              <Button variant="outline" asChild>
                <Link href="/login">Naar inloggen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(255,255,255,0.52), rgba(255,255,255,0.24)), url('/auth-login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card className="w-full max-w-md border-border bg-white shadow-2xl">
        <CardHeader className="text-center">
          <p className="mb-2 font-display text-2xl text-primary">Simply leeromgeving</p>
          <CardTitle className="font-display text-xl tracking-wider">ACCOUNT AANMAKEN</CardTitle>
          <CardDescription>
            Vul je email in. Je ontvangt een link in je inbox om je account te voltooien.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Accounttype</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm ${accountType === "client" ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
                  onClick={() => setAccountType("client")}
                >
                  Klantaccount
                </button>
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-2 text-sm ${accountType === "tenant_admin" ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
                  onClick={() => setAccountType("tenant_admin")}
                >
                  Coach platform
                </button>
              </div>
            </div>

            {accountType === "tenant_admin" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Platformnaam</Label>
                  <Input
                    id="tenantName"
                    placeholder="Bijv. Fit Academy"
                    value={tenantName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTenantName(value);
                      if (!tenantSlug) {
                        setTenantSlug(
                          value
                            .toLowerCase()
                            .replace(/[^\w\s-]/g, "")
                            .replace(/\s+/g, "-")
                            .replace(/-+/g, "-")
                            .trim()
                        );
                      }
                    }}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantSlug">Platform slug</Label>
                  <Input
                    id="tenantSlug"
                    placeholder="fit-academy"
                    value={tenantSlug}
                    onChange={(e) => setTenantSlug(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dit wordt je subdomein voor de onboarding van je platform.
                  </p>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jouw@email.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                accountType === "tenant_admin" ? "Platform starten" : "Link ontvangen"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Heb je al een account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Log in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
