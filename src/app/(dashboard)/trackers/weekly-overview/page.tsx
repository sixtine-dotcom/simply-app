"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, Download, TrendingUp, Footprints, Scale, Dumbbell, UtensilsCrossed, MessageCircle, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";

interface WeeklyHighlights {
  stepsTotal: number;
  stepsPreviousWeek: number;
  stepsDelta: number;
  weightCurrent: number | null;
  weightPrevious: number | null;
  weightDelta: number | null;
  workoutsCount: number;
  recipeTitles: string[];
  postsCount: number;
  commentsCount: number;
  likesReceived: number;
  lessonsCompleted: number;
}

interface SummaryData {
  id: string;
  weekStart: string;
  highlights: WeeklyHighlights;
}

export default function WeeklyOverviewPage() {
  const [data, setData] = useState<{ summary: SummaryData | null; weekStart?: string; weekEnd?: string; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/weekly-summary")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownloadImage = async () => {
    if (!shareCardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f0f5ef",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `simply-weekoverzicht-${data?.weekStart ?? "week"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    );
  }

  const summary = data?.summary;
  const highlights = summary?.highlights as WeeklyHighlights | undefined;
  const weekStart = data?.weekStart;
  const weekEnd = data?.weekEnd;

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-2xl">
      <Link
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar Mijn Omgeving
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider">
          WEEKOVERZICHT
        </h1>
        <p className="mt-2 text-muted-foreground">
          Wat heb je bereikt deze week? Deel je voortgang op Instagram of TikTok.
        </p>
      </div>

      {!summary ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto opacity-50 mb-4" />
            <p className="mb-2">{data?.message ?? "Nog geen weekoverzicht."}</p>
            <p className="text-sm">
              Aan het einde van elke week (zondag) ontvang je een overzicht op basis van je stappen, check-ins, workouts, recepten en community-activiteit.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Highlights lijst */}
          <div className="space-y-3 mb-8">
            {highlights?.stepsDelta !== undefined && highlights.stepsDelta > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Footprints className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{highlights.stepsDelta.toLocaleString("nl-NL")} stappen meer dan vorige week</p>
                    <p className="text-sm text-muted-foreground">Totaal deze week: {highlights.stepsTotal.toLocaleString("nl-NL")} stappen</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {highlights?.weightDelta != null && highlights.weightDelta > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{highlights.weightDelta} kg minder dan vorige week</p>
                    <p className="text-sm text-muted-foreground">
                      {highlights.weightPrevious} kg → {highlights.weightCurrent} kg
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {(highlights?.workoutsCount ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Dumbbell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">{(highlights?.workoutsCount ?? 0)} workout(s) deze week</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {highlights?.recipeTitles && highlights.recipeTitles.length > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <UtensilsCrossed className="h-5 w-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium">Recepten gepland deze week</p>
                    <p className="text-sm text-muted-foreground">
                      {highlights.recipeTitles.slice(0, 5).join(", ")}
                      {highlights.recipeTitles.length > 5 ? " …" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {((highlights?.postsCount ?? 0) > 0 || (highlights?.commentsCount ?? 0) > 0 || (highlights?.likesReceived ?? 0) > 0) && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium">Actief in de community</p>
                    <p className="text-sm text-muted-foreground">
                      {highlights?.postsCount ?? 0} post(s), {highlights?.commentsCount ?? 0} reactie(s), {highlights?.likesReceived ?? 0} like(s) ontvangen
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {(highlights?.lessonsCompleted ?? 0) > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-violet-700" />
                  </div>
                  <div>
                    <p className="font-medium">{highlights?.lessonsCompleted ?? 0} les(sen) afgerond</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Share card (voor download) */}
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Deel op sociale media</p>
            <div
              ref={shareCardRef}
              className="rounded-xl overflow-hidden border-2 border-primary/20 bg-[#f0f5ef] p-6 text-center"
              style={{ minHeight: 320 }}
            >
              <p className="font-display text-xl tracking-widest text-primary mb-1">SIMPLY</p>
              <p className="text-sm text-muted-foreground mb-4">Weekoverzicht</p>
              {weekStart && weekEnd && (
                <p className="text-sm font-medium text-foreground mb-4">
                  {new Date(weekStart).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – {new Date(weekEnd).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {highlights?.stepsDelta !== undefined && highlights.stepsDelta > 0 && (
                  <p className="text-sm">👟 {highlights.stepsDelta.toLocaleString("nl-NL")} stappen meer</p>
                )}
                {highlights?.weightDelta != null && highlights.weightDelta > 0 && (
                  <p className="text-sm">⚖️ {highlights.weightDelta} kg minder</p>
                )}
                {(highlights?.workoutsCount ?? 0) > 0 && (
                  <p className="text-sm">💪 {highlights?.workoutsCount ?? 0} workout(s)</p>
                )}
                {highlights?.recipeTitles && highlights.recipeTitles.length > 0 && (
                  <p className="text-sm">🍽️ {highlights.recipeTitles.length} recept(en) gepland</p>
                )}
                {((highlights?.postsCount ?? 0) > 0 || (highlights?.commentsCount ?? 0) > 0) && (
                  <p className="text-sm">💬 Actief in de community</p>
                )}
                {(highlights?.lessonsCompleted ?? 0) > 0 && (
                  <p className="text-sm">📚 {highlights?.lessonsCompleted ?? 0} les(sen) afgerond</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-6">simplyinbalance.com</p>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <Button onClick={handleDownloadImage} disabled={downloading}>
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Bezig…" : "Download als afbeelding"}
              </Button>
              <p className="text-sm text-muted-foreground self-center">
                Deel de afbeelding op Instagram of TikTok
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
