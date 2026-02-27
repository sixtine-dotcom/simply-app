"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShoppingBag, Trash2 } from "lucide-react";

interface ShopifyMappingCardProps {
  courseId: string;
}

interface Mapping {
  id: string;
  shopifyProductId: string;
  courseId: string;
  accessDays: number | null;
}

export function ShopifyMappingCard({ courseId }: ShopifyMappingCardProps) {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopifyProductId, setShopifyProductId] = useState("");
  const [accessDays, setAccessDays] = useState<string>("");

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}/shopify-mapping`)
      .then((res) => res.json())
      .then((data) => {
        if (data.mappings?.length) {
          setMappings(data.mappings);
          const first = data.mappings[0];
          setShopifyProductId(first.shopifyProductId);
          setAccessDays(first.accessDays != null ? String(first.accessDays) : "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopifyProductId.trim()) {
      toast({
        title: "Fout",
        description: "Vul een Shopify product ID in.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/shopify-mapping`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopifyProductId: shopifyProductId.trim(),
          accessDays: accessDays === "" ? null : parseInt(accessDays, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Opslaan mislukt");
      setMappings(data.mapping ? [data.mapping] : []);
      toast({
        title: "Opgeslagen",
        description: "Shopify product is gekoppeld aan deze cursus.",
      });
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon koppeling niet opslaan.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/shopify-mapping`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      setMappings([]);
      setShopifyProductId("");
      setAccessDays("");
      toast({
        title: "Koppeling verwijderd",
        description: "Dit product geeft geen toegang meer tot deze cursus.",
      });
    } catch (err) {
      toast({
        title: "Fout",
        description: err instanceof Error ? err.message : "Kon koppeling niet verwijderen.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Shopify verkoop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Laden...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Shopify verkoop
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Koppel een Shopify product aan deze cursus. Bij aankoop krijgen klanten direct toegang en een e-mail om in te loggen.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shopifyProductId">Shopify product ID</Label>
            <Input
              id="shopifyProductId"
              value={shopifyProductId}
              onChange={(e) => setShopifyProductId(e.target.value)}
              placeholder="bijv. 8234567890123"
            />
            <p className="text-xs text-muted-foreground">
              Te vinden in Shopify: Producten → product → URL of API (gid://shopify/Product/123456789)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessDays">Toegang (dagen, optioneel)</Label>
            <Input
              id="accessDays"
              type="number"
              min={0}
              value={accessDays}
              onChange={(e) => setAccessDays(e.target.value)}
              placeholder="Leeg = onbeperkt"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opslaan...
                </>
              ) : (
                "Koppeling opslaan"
              )}
            </Button>
            {mappings.length > 0 && (
              <Button type="button" variant="outline" onClick={handleRemove} disabled={saving}>
                <Trash2 className="h-4 w-4 mr-2" />
                Koppeling verwijderen
              </Button>
            )}
          </div>
        </form>
        {mappings.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Huidige koppeling: product <strong>{mappings[0].shopifyProductId}</strong>
            {mappings[0].accessDays != null && ` · ${mappings[0].accessDays} dagen toegang`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
