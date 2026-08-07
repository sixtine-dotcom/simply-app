"use client";

import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MagicLinkLoginFormProps = {
  nextPath: string;
};

export function MagicLinkLoginForm({ nextPath }: MagicLinkLoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: nextPath }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        devMagicLink?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "We konden geen inloglink versturen.");
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
        Stuur inloglink
      </Button>

      {message ? (
        <p
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
        Je ontvangt een link waarmee je meteen veilig ingelogd wordt. De link blijft 15 minuten geldig.
      </p>
    </form>
  );
}
