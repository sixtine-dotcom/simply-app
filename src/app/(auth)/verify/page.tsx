"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const nextPath = searchParams.get("next") || "/";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Geen token gevonden");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Verificatie mislukt");
        }

        setStatus("success");
        
        // Redirect to next (e.g. /admin) or dashboard after short delay
        setTimeout(() => {
          router.push(nextPath);
        }, 1500);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Er is iets misgegaan");
      }
    };

    verifyToken();
  }, [token, nextPath, router]);

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
              We verifiëren je inloglink...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <CardTitle className="font-display text-xl tracking-wider">INGELOGD!</CardTitle>
            <CardDescription>
              Je wordt doorgestuurd naar je dashboard...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-6 w-6 text-error" />
          </div>
          <CardTitle className="font-display text-xl tracking-wider">OEPS!</CardTitle>
          <CardDescription>
            {error || "De inloglink is ongeldig of verlopen"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={() => router.push("/login")}>
            Opnieuw inloggen
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
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
      <VerifyContent />
    </Suspense>
  );
}
