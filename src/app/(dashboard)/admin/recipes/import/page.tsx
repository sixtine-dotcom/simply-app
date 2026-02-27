"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, Download, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function ImportRecipesPage() {
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    updated: number;
    errors: number;
    importedRecipes: string[];
    updatedRecipes: string[];
    errorRecipes: string[];
  } | null>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/recipes/import", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Kon recepten niet importeren");
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: "Import voltooid",
        description: `${data.imported} nieuw, ${data.updated} bijgewerkt, ${data.errors} fouten`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon recepten niet importeren",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-3xl mx-auto">
      <Link 
        href="/admin/recipes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar recepten
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl tracking-wider flex items-center gap-2">
            <Download className="h-6 w-6" />
            RECEPTEN IMPORTEREN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground mb-4">
                Importeer alle recepten van je Simply in Balance website (simplyinbalance.com/blogs/recepten).
                Bestaande recepten worden bijgewerkt, nieuwe worden toegevoegd.
              </p>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Recepten importeren
                  </>
                )}
              </Button>
            </div>

            {result && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                    <p className="text-sm text-muted-foreground">Nieuw</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                    <p className="text-sm text-muted-foreground">Bijgewerkt</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    {result.errors > 0 ? (
                      <>
                        <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-600">0</p>
                      </>
                    )}
                    <p className="text-sm text-muted-foreground">Fouten</p>
                  </div>
                </div>

                {result.importedRecipes.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Nieuwe recepten ({result.importedRecipes.length})
                    </h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {result.importedRecipes.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.updatedRecipes.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      Bijgewerkte recepten ({result.updatedRecipes.length})
                    </h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {result.updatedRecipes.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.errorRecipes.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Fouten ({result.errorRecipes.length})
                    </h3>
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                      {result.errorRecipes.map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
