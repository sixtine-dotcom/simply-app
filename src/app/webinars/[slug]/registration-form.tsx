"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WebinarRegistrationForm({ slug, eventType = "online" }: { slug: string; eventType?: string }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [joinUrl, setJoinUrl] = useState("");
  const [registered, setRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    const response = await fetch(`/api/webinars/${slug}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setIsLoading(false);
    if (response.ok) {
      setRegistered(true);
      setJoinUrl(data.joinUrl || "");
    } else {
      setError(data.error || "Inschrijven lukt momenteel niet. Probeer het opnieuw.");
    }
  };

  if (registered) {
    return (
      <div className="rounded-md border bg-[#f7f7ff] p-4">
        <p className="font-medium">Je bent ingeschreven.</p>
        <p className="mt-2 text-sm text-muted-foreground">Je gegevens staan op de gastenlijst.</p>
        {eventType === "online" && joinUrl ? <Button className="mt-4" asChild>
          <a href={joinUrl}>Naar webinar</a>
        </Button> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Voornaam</Label>
        <Input
          value={form.firstName}
          onChange={(event) => setForm({ ...form, firstName: event.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Achternaam</Label>
        <Input
          value={form.lastName}
          onChange={(event) => setForm({ ...form, lastName: event.target.value })}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>E-mailadres</Label>
        <Input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Telefoonnummer</Label>
        <Input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
      </div>
      {error ? <p className="md:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Button className="md:col-span-2" disabled={isLoading}>
        {isLoading ? "Bezig..." : "Inschrijven"}
      </Button>
    </form>
  );
}
