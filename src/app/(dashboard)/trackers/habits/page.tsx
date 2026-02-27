"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Droplet, Loader2, Save, Footprints, Pill } from "lucide-react";

export default function HabitsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    waterGlasses: "",
    steps: "",
    supplements: false,
  });

  useEffect(() => {
    loadHabitData();
  }, [date]);

  const loadHabitData = async () => {
    setIsLoading(true);
    try {
      const selectedDate = new Date(date);
      const response = await fetch(
        `/api/trackers/habits?startDate=${selectedDate.toISOString()}&endDate=${selectedDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const log = data[0];
          setFormData({
            waterGlasses: log.waterGlasses?.toString() || "",
            steps: log.steps?.toString() || "",
            supplements: log.supplements || false,
          });
        } else {
          setFormData({ waterGlasses: "", steps: "", supplements: false });
        }
      }
    } catch (error) {
      console.error("Failed to load habit data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedDate = new Date(date);
      selectedDate.setHours(12, 0, 0, 0);

      const response = await fetch("/api/trackers/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          waterGlasses: formData.waterGlasses
            ? parseInt(formData.waterGlasses)
            : undefined,
          steps: formData.steps ? parseInt(formData.steps) : undefined,
          supplements: formData.supplements,
        }),
      });

      if (!response.ok) {
        throw new Error("Kon habits niet opslaan");
      }

      toast({
        title: "Opgeslagen",
        description: "Je habits zijn bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon habits niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl mx-auto">
      <Link 
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar trackers
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider flex items-center gap-2">
            <Droplet className="h-6 w-6" />
            HABIT TRACKER
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="waterGlasses" className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-cyan-500" />
                    Water (glazen)
                  </Label>
                  <Input
                    id="waterGlasses"
                    type="number"
                    min="0"
                    value={formData.waterGlasses}
                    onChange={(e) =>
                      setFormData({ ...formData, waterGlasses: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="steps" className="flex items-center gap-2">
                    <Footprints className="h-4 w-4 text-blue-500" />
                    Stappen
                  </Label>
                  <Input
                    id="steps"
                    type="number"
                    min="0"
                    value={formData.steps}
                    onChange={(e) =>
                      setFormData({ ...formData, steps: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <Label htmlFor="supplements" className="flex items-center gap-2 cursor-pointer">
                    <Pill className="h-4 w-4 text-purple-500" />
                    Suppletie genomen
                  </Label>
                  <input
                    id="supplements"
                    type="checkbox"
                    checked={formData.supplements}
                    onChange={(e) =>
                      setFormData({ ...formData, supplements: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </div>
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
