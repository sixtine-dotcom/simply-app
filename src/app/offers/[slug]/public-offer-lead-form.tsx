"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PublicOfferLeadForm({
  offerSlug,
  offerTitle,
}: {
  offerSlug: string;
  offerTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    note: "",
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/offers/${offerSlug}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Aanvraag versturen mislukt");
      }
      setSuccess(true);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        note: "",
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Aanvraag versturen mislukt"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="app-halo sticky top-6">
      <CardHeader>
        <CardTitle className="font-display text-2xl tracking-tight">Interesse in {offerTitle}?</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Je aanvraag is ontvangen. We nemen snel contact met je op.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Achternaam</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Bericht</Label>
              <textarea
                id="note"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                className="min-h-[120px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Vertel kort waar je hulp bij zoekt of wanneer je wilt starten."
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Aanvraag versturen
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
