"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email: email.trim() }),
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-6 flex justify-center">
            <Logo variant="auth" standalone />
          </div>
          <CardTitle className="font-display text-xl tracking-wider">ACCOUNT AANMAKEN</CardTitle>
          <CardDescription>
            Vul je email in. Je ontvangt een link in je inbox om je account te voltooien.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                "Link ontvangen"
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
