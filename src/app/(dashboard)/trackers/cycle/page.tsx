"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Heart, Loader2, Save } from "lucide-react";

export default function CyclePage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    phase: "",
    flowLevel: "",
    notes: "",
  });

  useEffect(() => {
    loadCycleData();
  }, [date]);

  const loadCycleData = async () => {
    setIsLoading(true);
    try {
      const selectedDate = new Date(date);
      const response = await fetch(
        `/api/trackers/cycle?startDate=${selectedDate.toISOString()}&endDate=${selectedDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const log = data[0];
          setFormData({
            phase: log.phase || "",
            flowLevel: log.flowLevel?.toString() || "",
            notes: log.notes || "",
          });
        } else {
          setFormData({ phase: "", flowLevel: "", notes: "" });
        }
      }
    } catch (error) {
      console.error("Failed to load cycle data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedDate = new Date(date);
      selectedDate.setHours(12, 0, 0, 0);

      const response = await fetch("/api/trackers/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          phase: formData.phase || undefined,
          flowLevel: formData.flowLevel ? parseInt(formData.flowLevel) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Kon cyclus niet opslaan");
      }

      toast({
        title: "Opgeslagen",
        description: "Je cyclus is bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon cyclus niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6 lg:p-8">
      <Link 
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar trackers
      </Link>

      <div className="app-panel app-halo mb-6 overflow-hidden">
        <p className="app-kicker">Cycle tracking</p>
        <h1 className="mt-3 flex items-center gap-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          <Heart className="h-7 w-7 text-primary" />
          Cyclus
        </h1>
        <p className="mt-3 text-muted-foreground">
          Registreer fase, flow en notities in een rustige gezondheidslog.
        </p>
      </div>

      <Card className="app-halo">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-tight">Dagelijkse cycluslog</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
                <Label htmlFor="phase">Fase</Label>
                <select
                  id="phase"
                  value={formData.phase}
                  onChange={(e) =>
                    setFormData({ ...formData, phase: e.target.value })
                  }
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecteer fase...</option>
                  <option value="menstrual">Menstruatie</option>
                  <option value="follicular">Folliculaire fase</option>
                  <option value="ovulation">Ovulatie</option>
                  <option value="luteal">Luteale fase</option>
                </select>
              </div>

              <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
                <div className="flex items-center justify-between">
                  <Label htmlFor="flowLevel">Flow niveau</Label>
                  <span className="text-sm font-medium">
                    {formData.flowLevel || "0"}/5
                  </span>
                </div>
                <input
                  id="flowLevel"
                  type="range"
                  min="1"
                  max="5"
                  value={formData.flowLevel || "0"}
                  onChange={(e) =>
                    setFormData({ ...formData, flowLevel: e.target.value })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Licht</span>
                  <span>Zwaar</span>
                </div>
              </div>

              <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
                <Label htmlFor="notes">Notities</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Extra notities over je cyclus..."
                />
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Opslaan
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
