"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Scale, Loader2, Save, Camera } from "lucide-react";

export default function CheckInsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    weight: "",
    waist: "",
    hip: "",
    arm: "",
    notes: "",
  });

  useEffect(() => {
    loadCheckIns();
  }, []);

  const loadCheckIns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trackers/checkins?limit=20");

      if (response.ok) {
        const data = await response.json();
        setCheckIns(data);
      }
    } catch (error) {
      console.error("Failed to load check-ins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedDate = new Date(formData.date);
      selectedDate.setHours(12, 0, 0, 0);

      const response = await fetch("/api/trackers/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          waist: formData.waist ? parseFloat(formData.waist) : undefined,
          hip: formData.hip ? parseFloat(formData.hip) : undefined,
          arm: formData.arm ? parseFloat(formData.arm) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Kon check-in niet opslaan");
      }

      toast({
        title: "Opgeslagen",
        description: "Je check-in is bijgewerkt.",
      });

      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        weight: "",
        waist: "",
        hip: "",
        arm: "",
        notes: "",
      });

      loadCheckIns();
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon check-in niet opslaan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl mx-auto">
      <Link 
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar trackers
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-wider flex items-center gap-2">
              <Scale className="h-5 w-5" />
              NIEUWE CHECK-IN
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Gewicht (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waist">Taille (cm)</Label>
                  <Input
                    id="waist"
                    type="number"
                    step="0.1"
                    value={formData.waist}
                    onChange={(e) =>
                      setFormData({ ...formData, waist: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hip">Heup (cm)</Label>
                  <Input
                    id="hip"
                    type="number"
                    step="0.1"
                    value={formData.hip}
                    onChange={(e) =>
                      setFormData({ ...formData, hip: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arm">Arm (cm)</Label>
                  <Input
                    id="arm"
                    type="number"
                    step="0.1"
                    value={formData.arm}
                    onChange={(e) =>
                      setFormData({ ...formData, arm: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notities</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Hoe voel je je? Wat zijn je doelen?"
                />
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  <Camera className="h-3 w-3 inline mr-1" />
                  Foto upload komt in een volgende versie
                </p>
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opslaan...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Check-in opslaan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl tracking-wider">
              GESCHIEDENIS
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : checkIns.length > 0 ? (
              <div className="space-y-4">
                {checkIns.map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Week {checkIn.weekNumber}, {checkIn.year}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(checkIn.date).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {checkIn.weight && (
                        <div>
                          <span className="text-muted-foreground">Gewicht: </span>
                          <span className="font-medium">{checkIn.weight} kg</span>
                        </div>
                      )}
                      {checkIn.waist && (
                        <div>
                          <span className="text-muted-foreground">Taille: </span>
                          <span className="font-medium">{checkIn.waist} cm</span>
                        </div>
                      )}
                      {checkIn.hip && (
                        <div>
                          <span className="text-muted-foreground">Heup: </span>
                          <span className="font-medium">{checkIn.hip} cm</span>
                        </div>
                      )}
                      {checkIn.arm && (
                        <div>
                          <span className="text-muted-foreground">Arm: </span>
                          <span className="font-medium">{checkIn.arm} cm</span>
                        </div>
                      )}
                    </div>
                    {checkIn.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {checkIn.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nog geen check-ins</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
