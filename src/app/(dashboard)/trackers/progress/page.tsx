"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ProgressPage() {
  const [nutritionData, setNutritionData] = useState<any[]>([]);
  const [checkInData, setCheckInData] = useState<any[]>([]);
  const [symptomData, setSymptomData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 30); // Last 30 days

      const [nutrition, checkIns, symptoms] = await Promise.all([
        fetch(
          `/api/trackers/nutrition?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}`
        ).then((r) => r.json()),
        fetch("/api/trackers/checkins?limit=10").then((r) => r.json()),
        fetch(
          `/api/trackers/symptoms?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}`
        ).then((r) => r.json()),
      ]);

      // Format nutrition data
      const nutritionFormatted = nutrition
        .map((log: any) => ({
          date: new Date(log.date).toLocaleDateString("nl-NL", {
            month: "short",
            day: "numeric",
          }),
          kcal: log.calories || 0,
          protein: log.protein || 0,
        }))
        .reverse();

      // Format check-in data
      const checkInFormatted = checkIns
        .map((checkIn: any) => ({
          week: `W${checkIn.weekNumber}`,
          weight: checkIn.weight || null,
          waist: checkIn.waist || null,
        }))
        .reverse();

      // Format symptom data
      const symptomFormatted = symptoms
        .map((log: any) => ({
          date: new Date(log.date).toLocaleDateString("nl-NL", {
            month: "short",
            day: "numeric",
          }),
          energie: log.energy || 0,
          cravings: log.cravings || 0,
          spijsvertering: log.digestion || 0,
          slaap: log.sleep || 0,
          stemming: log.mood || 0,
        }))
        .reverse();

      setNutritionData(nutritionFormatted);
      setCheckInData(checkInFormatted);
      setSymptomData(symptomFormatted);
    } catch (error) {
      console.error("Failed to load progress data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Link 
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar trackers
      </Link>

      <div className="app-panel app-halo mb-8 overflow-hidden">
        <p className="app-kicker">Progress analytics</p>
        <h1 className="mt-3 flex items-center gap-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          <TrendingUp className="h-7 w-7 text-primary" />
          Voortgang overzicht
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Bekijk je voortgang in grafieken en trends
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laden...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Nutrition Chart */}
          {nutritionData.length > 0 && (
            <Card className="app-halo">
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-tight">
                  Voeding (30 dagen)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={nutritionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="kcal"
                      stroke="#f97316"
                      name="Kcal"
                    />
                    <Line
                      type="monotone"
                      dataKey="protein"
                      stroke="#3b82f6"
                      name="Eiwit (g)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Check-in Chart */}
          {checkInData.length > 0 && (
            <Card className="app-halo">
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-tight">
                  Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={checkInData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="weight" fill="#3b82f6" name="Gewicht (kg)" />
                    <Bar dataKey="waist" fill="#10b981" name="Taille (cm)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Symptoms Chart */}
          {symptomData.length > 0 && (
            <Card className="app-halo">
              <CardHeader>
                <CardTitle className="font-display text-lg tracking-tight">
                  Symptomen (30 dagen)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={symptomData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="energie"
                      stroke="#fbbf24"
                      name="Energie"
                    />
                    <Line
                      type="monotone"
                      dataKey="cravings"
                      stroke="#ef4444"
                      name="Cravings"
                    />
                    <Line
                      type="monotone"
                      dataKey="spijsvertering"
                      stroke="#10b981"
                      name="Spijsvertering"
                    />
                    <Line
                      type="monotone"
                      dataKey="slaap"
                      stroke="#6366f1"
                      name="Slaap"
                    />
                    <Line
                      type="monotone"
                      dataKey="stemming"
                      stroke="#ec4899"
                      name="Stemming"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {nutritionData.length === 0 &&
            checkInData.length === 0 &&
            symptomData.length === 0 && (
              <Card className="app-halo">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h2 className="mb-2 font-display text-xl tracking-tight">
                    Nog geen data
                  </h2>
                  <p className="text-muted-foreground">
                    Start met het bijhouden van je voeding, check-ins en
                    symptomen om je voortgang te zien.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
