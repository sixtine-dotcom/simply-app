"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);
  const [desktopUrl, setDesktopUrl] = useState<string>("");

  const nextPath = searchParams.get("next") || "";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const base = window.location.origin;
      setDesktopUrl(nextPath === "/admin" ? `${base}/admin/login` : `${base}/login`);
    }
  }, [nextPath]);

  useEffect(() => {
    if (searchParams.get("message") === "existing") {
      setMessage("Je hebt al een account. Log in met je email.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setDevMagicLink(null);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(nextPath ? { next: nextPath } : {}) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Er is iets misgegaan");
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
              {devMagicLink ? "GEBRUIK ONDERSTAANDE LINK" : "CHECK JE EMAIL"}
            </CardTitle>
            <CardDescription className="mt-2">
              {devMagicLink
                ? "De email kon niet worden verstuurd (Resend niet geconfigureerd). Klik op de link hieronder om in te loggen."
                : <>We hebben een inloglink gestuurd naar <strong>{email}</strong></>}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {!devMagicLink && (
              <p className="text-sm text-muted-foreground">
                Klik op de link in de email om in te loggen. De link is 15 minuten geldig.
              </p>
            )}
            {devMagicLink && (
              <div className="p-4 bg-muted rounded-lg text-left">
                <p className="text-xs font-medium text-muted-foreground mb-2">Klik op deze link om in te loggen:</p>
                <a
                  href={devMagicLink}
                  className="text-sm text-primary hover:underline break-all"
                >
                  {devMagicLink}
                </a>
                <p className="text-xs text-muted-foreground mt-2">Klik op de link om in te loggen.</p>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setIsSuccess(false);
                setEmail("");
              }}
            >
              Andere email gebruiken
            </Button>
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
          <CardTitle className="font-display text-xl tracking-wider">WELKOM TERUG</CardTitle>
          <CardDescription>
            {nextPath === "/admin"
              ? "Log in voor het admin-panel. Vul je email in om een inloglink te ontvangen."
              : "Vul je email in om een inloglink te ontvangen"}
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

            {(message || error) && (
              <p className={`text-sm text-center ${error ? "text-destructive" : "text-muted-foreground"}`}>
                {error || message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Bezig...
                </>
              ) : (
                "Verstuur inloglink"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nog geen account?{" "}
              <Link
                href="/register"
                className="text-primary hover:underline font-medium"
              >
                Account aanmaken
              </Link>
            </p>
          </div>

          {desktopUrl && (
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground mb-1">Desktop-URL (bookmark):</p>
              <a
                href={desktopUrl}
                className="text-sm text-primary hover:underline break-all font-medium"
              >
                {desktopUrl}
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
