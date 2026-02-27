"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, UtensilsCrossed, Loader2, Save } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function NutritionPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  useEffect(() => {
    loadNutritionData();
  }, [date]);

  const loadNutritionData = async () => {
    setIsLoading(true);
    try {
      const selectedDate = new Date(date);
      const response = await fetch(
        `/api/trackers/nutrition?startDate=${selectedDate.toISOString()}&endDate=${selectedDate.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const log = data[0];
          setFormData({
            calories: log.calories?.toString() || "",
            protein: log.protein?.toString() || "",
            carbs: log.carbs?.toString() || "",
            fat: log.fat?.toString() || "",
          });
        } else {
          setFormData({ calories: "", protein: "", carbs: "", fat: "" });
        }
      }
    } catch (error) {
      console.error("Failed to load nutrition data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedDate = new Date(date);
      selectedDate.setHours(12, 0, 0, 0);

      const response = await fetch("/api/trackers/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          calories: formData.calories ? parseInt(formData.calories) : undefined,
          protein: formData.protein ? parseInt(formData.protein) : undefined,
          carbs: formData.carbs ? parseInt(formData.carbs) : undefined,
          fat: formData.fat ? parseInt(formData.fat) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Kon voeding niet opslaan");
      }

      toast({
        title: "Opgeslagen",
        description: "Je voeding is bijgewerkt.",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon voeding niet opslaan",
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
            <UtensilsCrossed className="h-6 w-6" />
            VOEDING TRACKER
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Kcal</Label>
                  <Input
                    id="calories"
                    type="number"
                    min="0"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({ ...formData, calories: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="protein">Eiwit (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    min="0"
                    value={formData.protein}
                    onChange={(e) =>
                      setFormData({ ...formData, protein: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carbs">Koolhydraten (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    min="0"
                    value={formData.carbs}
                    onChange={(e) =>
                      setFormData({ ...formData, carbs: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fat">Vet (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    min="0"
                    value={formData.fat}
                    onChange={(e) =>
                      setFormData({ ...formData, fat: e.target.value })
                    }
                    placeholder="0"
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
