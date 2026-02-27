"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send } from "lucide-react";
import Link from "next/link";

export function TestEmailForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Fout",
          description: data.error || data.detail || "Kon mail niet versturen",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Verstuurd",
        description: `Check je inbox op ${email} (en spam).`,
      });
    } catch {
      toast({
        title: "Fout",
        description: "Er is iets misgegaan.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Emailadres</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jouw@email.nl"
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Stuur testmail
          </>
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Zorg dat <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> in .env.local staat
        (gratis key op resend.com).
      </p>
      <Link
        href="/admin"
        className="inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Terug naar admin
      </Link>
    </form>
  );
}
