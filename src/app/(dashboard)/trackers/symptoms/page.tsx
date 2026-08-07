"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Activity, Loader2, Save } from "lucide-react";

export default function SymptomsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    energy: "",
    cravings: "",
    digestion: "",
    sleep: "",
    mood: "",
    notes: "",
  });

  useEffect(() => {
    loadSymptomData();
  }, [date]);

  const loadSymptomData = async () => {
    setIsLoading(true);
    try {
      const selectedDate = new Date(date);
      const response = await fetch(
        `/api/trackers/symptoms?startDate=${selectedDate.toISOString()}&endDate=${selectedDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const log = data[0];
          setFormData({
            energy: log.energy?.toString() || "",
            cravings: log.cravings?.toString() || "",
            digestion: log.digestion?.toString() || "",
            sleep: log.sleep?.toString() || "",
            mood: log.mood?.toString() || "",
            notes: log.notes || "",
          });
        } else {
          setFormData({
            energy: "",
            cravings: "",
            digestion: "",
            sleep: "",
            mood: "",
            notes: "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load symptom data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedDate = new Date(date);
      selectedDate.setHours(12, 0, 0, 0);

      const response = await fetch("/api/trackers/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          energy: formData.energy ? parseInt(formData.energy) : undefined,
          cravings: formData.cravings ? parseInt(formData.cravings) : undefined,
          digestion: formData.digestion ? parseInt(formData.digestion) : undefined,
          sleep: formData.sleep ? parseInt(formData.sleep) : undefined,
          mood: formData.mood ? parseInt(formData.mood) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Kon symptomen niet opslaan");
      }

      toast({
        title: "Opgeslagen",
        description: "Je symptomen zijn bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon symptomen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const SymptomSlider = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium">{value || "0"}/10</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value || "0"}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Laag</span>
        <span>Hoog</span>
      </div>
    </div>
  );

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
        <p className="app-kicker">Symptom monitor</p>
        <h1 className="mt-3 flex items-center gap-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          <Activity className="h-7 w-7 text-primary" />
          Symptomen
        </h1>
        <p className="mt-3 text-muted-foreground">
          Monitor energie, cravings, spijsvertering, slaap en stemming in één dagelijkse check-in.
        </p>
      </div>

      <Card className="app-halo">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-tight">Dagelijkse symptoomscan</CardTitle>
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

              <div className="space-y-6 rounded-[24px] border border-border/70 bg-muted/15 px-4 py-5">
                <SymptomSlider
                  label="Energie"
                  value={formData.energy}
                  onChange={(value) =>
                    setFormData({ ...formData, energy: value })
                  }
                />
                <SymptomSlider
                  label="Cravings"
                  value={formData.cravings}
                  onChange={(value) =>
                    setFormData({ ...formData, cravings: value })
                  }
                />
                <SymptomSlider
                  label="Spijsvertering"
                  value={formData.digestion}
                  onChange={(value) =>
                    setFormData({ ...formData, digestion: value })
                  }
                />
                <SymptomSlider
                  label="Slaap"
                  value={formData.sleep}
                  onChange={(value) =>
                    setFormData({ ...formData, sleep: value })
                  }
                />
                <SymptomSlider
                  label="Stemming"
                  value={formData.mood}
                  onChange={(value) =>
                    setFormData({ ...formData, mood: value })
                  }
                />
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
                  placeholder="Extra notities over je symptomen..."
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
