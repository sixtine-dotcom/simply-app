"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2, Calendar } from "lucide-react";

function getDurationMinutes(dateValue: string, startTime: string, endTime: string) {
  if (!dateValue || !startTime || !endTime) return null;
  const startsAt = new Date(`${dateValue}T${startTime}`);
  const endsAt = new Date(`${dateValue}T${endTime}`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return null;
  return Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "Kies begin- en eindtijd";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} minuten`;
  return `${hours} uur${rest ? ` ${rest} minuten` : ""}`;
}

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientIds: searchParams.get("clientId") ? [searchParams.get("clientId") as string] : [] as string[],
    coachId: "",
    title: "",
    description: "",
    scheduledDate: "",
    startTime: "",
    endTime: "",
  });

  // Fetch clients and coaches on mount
  useEffect(() => {
    fetch("/api/admin/users?role=CLIENT")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(console.error);

    fetch("/api/admin/users?role=COACH")
      .then((res) => res.json())
      .then((data) => setCoaches(data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Combine date and time
      const duration = getDurationMinutes(
        formData.scheduledDate,
        formData.startTime,
        formData.endTime
      );

      if (!duration || duration < 5) {
        throw new Error("Eindtijd moet minstens 5 minuten na de begintijd liggen");
      }

      if (duration > 1440) {
        throw new Error("Een sessie kan maximaal 24 uur duren");
      }

      const scheduledAt = new Date(
        `${formData.scheduledDate}T${formData.startTime}`
      );

      const response = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientIds: formData.clientIds,
          coachId: formData.coachId || undefined,
          title: formData.title || undefined,
          description: formData.description || undefined,
          scheduledAt: scheduledAt.toISOString(),
          duration,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Kon sessie niet plannen");
      }

      toast({
        title: "Sessie gepland",
        description: "De coaching sessie is ingepland.",
      });

      router.push("/admin/sessions");
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon sessie niet plannen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link 
        href="/admin/sessions"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar sessies
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider">
            NIEUWE SESSIE PLANNEN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Klanten *</Label>
              <div className="max-h-56 space-y-2 overflow-auto rounded-lg border bg-background p-3">
                {clients.map((client) => {
                  const checked = formData.clientIds.includes(client.id);
                  return (
                    <label key={client.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            clientIds: event.target.checked
                              ? [...current.clientIds, client.id]
                              : current.clientIds.filter((id) => id !== client.id),
                          }))
                        }
                      />
                      <span>
                        {client.firstName} {client.lastName} ({client.email})
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecteer één klant voor een 1-op-1 call of meerdere klanten voor één gedeelde groepscall.
              </p>
            </div>

            {coaches.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="coachId">Coach</Label>
                <select
                  id="coachId"
                  value={formData.coachId}
                  onChange={(e) => setFormData({ ...formData, coachId: e.target.value })}
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Huidige gebruiker / admin</option>
                  {coaches.map((coach) => (
                    <option key={coach.id} value={coach.id}>
                      {coach.firstName} {coach.lastName} ({coach.email})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="title">Titel (optioneel)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="bijv. Intake gesprek"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschrijving (optioneel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Agenda, voorbereiding, linkjes of aandachtspunten voor de sessie..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Datum *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Begintijd *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endTime">Eindtijd *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duur</Label>
                <div className="flex min-h-10 items-center rounded-lg border bg-muted/20 px-3 text-sm text-muted-foreground">
                  {formatDuration(
                    getDurationMinutes(
                      formData.scheduledDate,
                      formData.startTime,
                      formData.endTime
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Plannen...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Sessie plannen
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/sessions">Annuleren</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
