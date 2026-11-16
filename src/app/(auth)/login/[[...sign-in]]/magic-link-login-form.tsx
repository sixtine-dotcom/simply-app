"use client";

import { safeLoginDestination } from "@/lib/auth-navigation";
import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MagicLinkLoginFormProps = {
  nextPath: string;
};

export function MagicLinkLoginForm({ nextPath }: MagicLinkLoginFormProps) {
  const [mode, setMode] = useState<"link" | "password">("link");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(mode === "password" ? "/api/auth/password" : "/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: safeLoginDestination(nextPath), ...(mode === "password" ? { password } : {}) }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        devMagicLink?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "We konden geen inloglink versturen.");
      }

      if (mode === "password") {
        window.location.assign(safeLoginDestination(nextPath));
        return;
      }
      if (data.devMagicLink) {
        window.location.href = data.devMagicLink;
        return;
      }

      setStatus("success");
      setMessage("Check je mailbox. We hebben je een veilige inloglink gestuurd.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Er is iets misgegaan.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-[0_18px_55px_-34px_rgba(15,23,42,0.5)]">
      <div className="space-y-2">
        <Label htmlFor="email">E-mailadres</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="jij@example.com"
          required
          className="h-12 rounded-2xl bg-white"
        />
      </div>

      {mode === "password" ? <div className="mt-4 space-y-2"><Label htmlFor="login-password">Wachtwoord</Label><Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} maxLength={256} required className="h-12 rounded-2xl" /></div> : null}
      <Button
        type="submit"
        className="mt-4 h-12 w-full rounded-2xl"
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        {mode === "password" ? "Inloggen" : "Stuur inloglink"}
      </Button>

      <Button type="button" variant="ghost" className="mt-2 min-h-11 w-full" onClick={() => {setMode(mode === "password" ? "link" : "password");setStatus("idle");setMessage("");setPassword("");}}>
        {mode === "password" ? "Wachtwoord vergeten? Gebruik een inloglink" : "Inloggen met wachtwoord"}
      </Button>
      {message ? (
        <p
          role={status === "error" ? "alert" : "status"}
          className={
            status === "error"
              ? "mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              : "mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm leading-6 text-primary"
          }
        >
          {message}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {mode === "link" ? "Je ontvangt een link waarmee je veilig inlogt. De link blijft 15 minuten geldig." : "Nog geen wachtwoord ingesteld? Log in met een inloglink en stel het daarna in bij Instellingen."}
      </p>
    </form>
  );
}
