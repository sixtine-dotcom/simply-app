"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Loader2, Calendar, Clock } from "lucide-react";

export default function NewSessionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    scheduledDate: "",
    scheduledTime: "",
    duration: "45",
  });

  // Fetch clients on mount
  useEffect(() => {
    fetch("/api/admin/users?role=CLIENT")
      .then((res) => res.json())
      .then((data) => setClients(data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Combine date and time
      const scheduledAt = new Date(
        `${formData.scheduledDate}T${formData.scheduledTime}`
      );

      const response = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.clientId,
          title: formData.title || undefined,
          scheduledAt: scheduledAt.toISOString(),
          duration: parseInt(formData.duration),
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
              <Label htmlFor="clientId">Klant *</Label>
              <select
                id="clientId"
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Selecteer klant...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titel (optioneel)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="bijv. Intake gesprek"
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
                <Label htmlFor="scheduledTime">Tijd *</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duur (minuten) *</Label>
              <select
                id="duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                required
              >
                <option value="30">30 minuten</option>
                <option value="45">45 minuten</option>
                <option value="60">60 minuten</option>
                <option value="90">90 minuten</option>
              </select>
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
