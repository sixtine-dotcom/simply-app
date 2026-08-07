"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, UtensilsCrossed, Loader2, Save, Search, Plus, Barcode, Camera, CameraOff } from "lucide-react";

type DetectedBarcode = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
    ReactNativeWebView?: unknown;
    Capacitor?: unknown;
  }
}

type FoodServing = {
  id: string;
  description: string;
  metricAmount: number | null;
  metricUnit: string | null;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
};

type FoodSearchResult = {
  id: string;
  name: string;
  brandName: string | null;
  description: string | null;
  foodType: string | null;
  url: string | null;
  imageUrl?: string | null;
  servings: FoodServing[];
};

export default function NutritionPage() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingFoods, setIsSearchingFoods] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScannerStarting, setIsScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isAppScannerAvailable, setIsAppScannerAvailable] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [foodResults, setFoodResults] = useState<FoodSearchResult[]>([]);
  const [selectedServingId, setSelectedServingId] = useState<Record<string, string>>({});
  const [quantityByFoodId, setQuantityByFoodId] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  useEffect(() => {
    loadNutritionData();
  }, [date]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const runningInApp =
      Boolean(window.ReactNativeWebView) ||
      Boolean(window.Capacitor) ||
      userAgent.includes("simplyapp") ||
      userAgent.includes("wv");

    setIsAppScannerAvailable(runningInApp);
  }, []);

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

  const searchFoods = async () => {
    if (!foodQuery.trim()) {
      setFoodResults([]);
      return;
    }

    setIsSearchingFoods(true);
    try {
      const response = await fetch(`/api/food/search?q=${encodeURIComponent(foodQuery.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Zoeken mislukt");
      }
      setFoodResults(data.foods || []);
    } catch (error) {
      toast({
        title: "Zoeken mislukt",
        description: error instanceof Error ? error.message : "Kon producten niet zoeken",
        variant: "destructive",
      });
    } finally {
      setIsSearchingFoods(false);
    }
  };

  const lookupBarcodeValue = async (barcodeValue: string) => {
    if (!barcodeValue.trim()) {
      return;
    }

    setIsLookingUpBarcode(true);
    try {
      const response = await fetch(`/api/food/barcode?barcode=${encodeURIComponent(barcodeValue.trim())}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Barcode lookup mislukt");
      }

      if (!data.food) {
        toast({
          title: "Geen product gevonden",
          description: "Voor deze barcode is geen product gevonden.",
          variant: "destructive",
        });
        return;
      }

      setFoodResults([data.food]);
      setFoodQuery(data.food.brandName ? `${data.food.brandName} ${data.food.name}` : data.food.name);
      setBarcode(barcodeValue.trim());
    } catch (error) {
      toast({
        title: "Barcode lookup mislukt",
        description: error instanceof Error ? error.message : "Kon barcode niet ophalen",
        variant: "destructive",
      });
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const lookupBarcode = async () => {
    await lookupBarcodeValue(barcode);
  };

  const stopScanner = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScannerOpen(false);
    setIsScannerStarting(false);
  };

  const scanFrame = async () => {
    if (!videoRef.current || !detectorRef.current) {
      return;
    }

    if (videoRef.current.readyState < 2) {
      frameRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
      return;
    }

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      const detectedValue = barcodes.find((item) => item.rawValue?.trim())?.rawValue?.trim();

      if (detectedValue && detectedValue !== lastScannedCodeRef.current) {
        lastScannedCodeRef.current = detectedValue;
        setScannerError(null);
        stopScanner();
        await lookupBarcodeValue(detectedValue);
        toast({
          title: "Barcode gescand",
          description: `Productcode ${detectedValue} is opgezocht.`,
        });
        return;
      }
    } catch (error) {
      setScannerError(
        error instanceof Error ? error.message : "Scannen is tijdelijk niet beschikbaar op dit toestel."
      );
      stopScanner();
      return;
    }

    frameRef.current = requestAnimationFrame(() => {
      void scanFrame();
    });
  };

  const startScanner = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    if (!isAppScannerAvailable) {
      setScannerError("De live scanner is alleen beschikbaar in de mobiele app. In de webversie kun je wel handmatig zoeken of een barcode invullen.");
      return;
    }

    if (!window.BarcodeDetector) {
      setScannerError("De app ondersteunt live barcodescannen nog niet op dit toestel. Gebruik voorlopig de barcode-invoer hieronder.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Cameratoegang is niet beschikbaar op dit toestel.");
      return;
    }

    setIsScannerStarting(true);
    setScannerError(null);
    lastScannedCodeRef.current = null;

    try {
      detectorRef.current = new window.BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsScannerOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      frameRef.current = requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch (error) {
      setScannerError(
        error instanceof Error
          ? error.message
          : "Kon de camera niet starten. Controleer je rechten en probeer opnieuw."
      );
      stopScanner();
    } finally {
      setIsScannerStarting(false);
    }
  };

  const addServingToTotals = (food: FoodSearchResult) => {
    const selectedServing =
      food.servings.find((serving) => serving.id === selectedServingId[food.id]) ??
      food.servings[0];

    if (!selectedServing) {
      toast({
        title: "Geen portie gevonden",
        description: "Dit product heeft geen bruikbare voedingswaarden.",
        variant: "destructive",
      });
      return;
    }

    const quantity = Number(quantityByFoodId[food.id] || "1");
    const multiplier = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;

    const nextTotals = {
      calories: String((Number(formData.calories || "0") + Math.round(selectedServing.calories * multiplier))),
      protein: String((Number(formData.protein || "0") + Math.round(selectedServing.protein * multiplier))),
      carbs: String((Number(formData.carbs || "0") + Math.round(selectedServing.carbs * multiplier))),
      fat: String((Number(formData.fat || "0") + Math.round(selectedServing.fat * multiplier))),
    };

    setFormData(nextTotals);

    toast({
      title: "Toegevoegd",
      description: `${food.brandName ? `${food.brandName} ` : ""}${food.name} is toegevoegd aan je dagtotalen.`,
    });
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
    <div className="mx-auto max-w-3xl p-4 md:p-6 lg:p-8">
      <Link 
        href="/trackers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar trackers
      </Link>

      <div className="app-panel app-halo mb-6 overflow-hidden">
        <p className="app-kicker">Nutrition tracker</p>
        <h1 className="mt-3 flex items-center gap-3 font-display text-3xl tracking-tight text-slate-950 md:text-5xl">
          <UtensilsCrossed className="h-7 w-7 text-primary" />
          Voeding
        </h1>
        <p className="mt-3 text-muted-foreground">
          Hou calorieën en macro&apos;s bij in een rustige dagelijkse log.
        </p>
      </div>

      <Card className="app-halo">
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-tight">Dagelijkse intake</CardTitle>
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

              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg tracking-tight text-slate-950">
                    Product zoeken in voedingsdatabase
                  </h2>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Zoek in Open Food Facts op merk, product of barcode en tel kcal en macro&apos;s automatisch op.
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="flex gap-2">
                    <Input
                      value={foodQuery}
                      onChange={(e) => setFoodQuery(e.target.value)}
                      placeholder="Bijv. Alpro yoghurt, haverdrink, crackers"
                    />
                    <Button type="button" variant="outline" onClick={() => void searchFoods()} disabled={isSearchingFoods}>
                      {isSearchingFoods ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex min-w-[180px] gap-2">
                      <Input
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="Barcode"
                      />
                      <Button type="button" variant="outline" onClick={() => void lookupBarcode()} disabled={isLookingUpBarcode}>
                        {isLookingUpBarcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Barcode className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-black/5 bg-stone-50/80 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium text-slate-950">Scan product in de winkel</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Deze flow staat al klaar voor de mobiele app. In de webversie blijft handmatige barcode-invoer beschikbaar.
                      </p>
                    </div>
                    {isScannerOpen ? (
                      <Button type="button" variant="outline" onClick={stopScanner}>
                        <CameraOff className="mr-2 h-4 w-4" />
                        Stop scanner
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void startScanner()}
                        disabled={isScannerStarting || !isAppScannerAvailable}
                      >
                        {isScannerStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        {isAppScannerAvailable ? "Scan barcode" : "Alleen in app"}
                      </Button>
                    )}
                  </div>

                  {scannerError && (
                    <p className="mt-3 text-sm text-rose-600">{scannerError}</p>
                  )}

                  {!isAppScannerAvailable && !scannerError && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Zodra je native app live staat, kan deze knop enkel daar de camera openen voor direct scannen in de winkel.
                    </p>
                  )}

                  {isScannerOpen && (
                    <div className="mt-4 overflow-hidden rounded-[24px] border border-black/5 bg-slate-950">
                      <div className="relative aspect-[4/3] w-full">
                        <video
                          ref={videoRef}
                          className="h-full w-full object-cover"
                          muted
                          playsInline
                          autoPlay
                        />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-24 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
                        </div>
                      </div>
                      <p className="px-4 py-3 text-sm text-stone-200">
                        Richt de barcode binnen het kader. Zodra we een code lezen, zoeken we het product meteen op.
                      </p>
                    </div>
                  )}
                </div>

                {foodResults.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {foodResults.map((food) => {
                      const currentServingId = selectedServingId[food.id] ?? food.servings[0]?.id ?? "";
                      return (
                        <div key={food.id} className="rounded-2xl border border-black/5 bg-stone-50/80 p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-slate-950">
                                {food.brandName ? `${food.brandName} · ${food.name}` : food.name}
                              </p>
                              {food.description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {food.description}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              onClick={() => addServingToTotals(food)}
                              disabled={food.servings.length === 0}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Voeg toe
                            </Button>
                          </div>

                          {food.servings.length > 0 ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                              <div className="space-y-2">
                                <Label>Portie</Label>
                                <select
                                  value={currentServingId}
                                  onChange={(e) =>
                                    setSelectedServingId((current) => ({
                                      ...current,
                                      [food.id]: e.target.value,
                                    }))
                                  }
                                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                  {food.servings.map((serving) => (
                                    <option key={serving.id} value={serving.id}>
                                      {serving.description}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label>Aantal</Label>
                                <Input
                                  inputMode="decimal"
                                  value={quantityByFoodId[food.id] ?? "1"}
                                  onChange={(e) =>
                                    setQuantityByFoodId((current) => ({
                                      ...current,
                                      [food.id]: e.target.value,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">
                              Geen portiegegevens beschikbaar voor dit product.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
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

                <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
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

                <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
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

                <div className="app-panel-muted space-y-2 px-4 py-4 shadow-none">
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
