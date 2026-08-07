"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "./location-autocomplete";

export function WebinarCreateForm({ eventsMode = false }: { eventsMode?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    duration: "60",
    autoRecord: true,
    eventType: "online",
    location: "",
    onlineUrl: "",
    bannerUrl: "",
    capacity: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadBanner = async (file: File) => {
    setIsUploading(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    const data = await response.json();
    setIsUploading(false);
    if (!response.ok) {
      setError(data.error || "De banner kon niet worden opgeladen.");
      return;
    }
    setForm((current) => ({ ...current, bannerUrl: data.url }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const response = await fetch("/api/admin/webinars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        startsAt: new Date(`${form.date}T${form.time}`).toISOString(),
        duration: Number(form.duration),
        autoRecord: form.autoRecord,
        eventType: form.eventType,
        location: form.location,
        onlineUrl: form.onlineUrl,
        bannerUrl: form.bannerUrl,
        capacity: form.capacity ? Number(form.capacity) : null,
      }),
    });
    setIsLoading(false);
    if (response.ok) router.push(eventsMode ? "/admin/events" : "/admin/webinars");
    else setError("Het event kon niet worden aangemaakt. Controleer de gegevens.");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Titel</Label>
        <Input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          required
        />
      </div>
      {eventsMode ? (
        <div className="space-y-2">
          <Label>Bannerfoto</Label>
          <label className="block cursor-pointer overflow-hidden rounded-xl border border-dashed border-border bg-slate-50 transition-colors hover:border-primary/40">
            {form.bannerUrl ? (
              <span className="block h-44 bg-cover bg-center" style={{ backgroundImage: `url(${form.bannerUrl})` }} />
            ) : (
              <span className="flex h-32 items-center justify-center px-4 text-center text-sm text-muted-foreground">Klik om een eigen bannerfoto te uploaden</span>
            )}
            <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadBanner(file); }} />
          </label>
          <p className="text-xs text-muted-foreground">{isUploading ? "Foto wordt opgeladen..." : form.bannerUrl ? "Klik op de foto om ze te vervangen." : "Aanbevolen: een brede liggende foto."}</p>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Type event</Label>
        <div className="flex gap-2">
          {(["online", "physical"] as const).map((type) => (
            <button key={type} type="button" onClick={() => setForm({ ...form, eventType: type })} className={`rounded-lg border px-3 py-2 text-sm ${form.eventType === type ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
              {type === "online" ? "Online" : "Fysiek"}
            </button>
          ))}
        </div>
      </div>
      {form.eventType === "physical" ? (
        <div className="space-y-2"><Label>Locatie</Label><LocationAutocomplete value={form.location} onChange={(location) => setForm({ ...form, location })} /><p className="text-xs text-muted-foreground">Kies bij voorkeur een volledig adres uit de suggesties.</p></div>
      ) : (
        <div className="space-y-2"><Label>Online link</Label><Input value={form.onlineUrl} onChange={(event) => setForm({ ...form, onlineUrl: event.target.value })} placeholder="https://… (kan ook later)" /></div>
      )}
      <div className="space-y-2"><Label>Maximum aantal gasten (optioneel)</Label><Input type="number" min="1" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></div>
      <div className="space-y-2">
        <Label>Beschrijving</Label>
        <Textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Datum</Label>
          <Input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Start</Label>
          <Input
            type="time"
            value={form.time}
            onChange={(event) => setForm({ ...form, time: event.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Duur</Label>
          <Input
            type="number"
            min="5"
            max="1440"
            value={form.duration}
            onChange={(event) => setForm({ ...form, duration: event.target.value })}
          />
        </div>
      </div>
      {!eventsMode ? <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.autoRecord}
          onChange={(event) => setForm({ ...form, autoRecord: event.target.checked })}
        />
        Automatisch opnemen
      </label> : null}
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Button disabled={isLoading || isUploading}>{eventsMode ? "Event aanmaken" : "Webinar maken"}</Button>
    </form>
  );
}
