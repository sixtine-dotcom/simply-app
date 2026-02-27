"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ShoppingCart, Check, X, Loader2, Plus } from "lucide-react";
export default function GroceryListPage() {
  const { toast } = useToast();
  const [lists, setLists] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  useEffect(() => {
    loadLists();
    loadRecipes();
  }, []);

  const loadLists = async () => {
    try {
      const response = await fetch("/api/recipes/grocery-list");
      if (response.ok) {
        const data = await response.json();
        setLists(data);
        if (data.length > 0 && !selectedList) {
          setSelectedList(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load lists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await fetch("/api/recipes?limit=100");
      if (response.ok) {
        const data = await response.json();
        setRecipes(data);
      }
    } catch (error) {
      console.error("Failed to load recipes:", error);
    }
  };

  const createList = async () => {
    if (selectedRecipes.length === 0) {
      toast({
        title: "Fout",
        description: "Selecteer minimaal één recept",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/recipes/grocery-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeIds: selectedRecipes }),
      });

      if (!response.ok) {
        throw new Error("Kon lijst niet aanmaken");
      }

      const newList = await response.json();
      setLists([newList, ...lists]);
      setSelectedList(newList);
      setSelectedRecipes([]);
      
      toast({
        title: "Lijst aangemaakt",
        description: "Je boodschappenlijst is klaar!",
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: error instanceof Error ? error.message : "Kon lijst niet aanmaken",
        variant: "destructive",
      });
    }
  };

  const toggleItem = async (itemId: string, isChecked: boolean) => {
    try {
      const response = await fetch(`/api/recipes/grocery-list/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked: !isChecked }),
      });

      if (response.ok) {
        loadLists();
      }
    } catch (error) {
      console.error("Failed to toggle item:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 lg:p-12">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-12 max-w-4xl mx-auto">
      <Link 
        href="/recipes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Terug naar recepten
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl tracking-wider flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          BOODSCHAPPENLIJST
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wider">
              NIEUWE LIJST
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecteer recepten om een boodschappenlijst te genereren
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                {recipes.map((recipe) => (
                  <label
                    key={recipe.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipes.includes(recipe.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecipes([...selectedRecipes, recipe.id]);
                        } else {
                          setSelectedRecipes(
                            selectedRecipes.filter((id) => id !== recipe.id)
                          );
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{recipe.title}</span>
                  </label>
                ))}
              </div>

              <Button onClick={createList} disabled={selectedRecipes.length === 0} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Lijst genereren
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing Lists */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wider">
              JOUW LIJSTEN
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lists.length > 0 ? (
              <div className="space-y-4">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedList?.id === list.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedList(list)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{list.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {list.items.length} items
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(list.createdAt).toLocaleDateString("nl-NL")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nog geen boodschappenlijsten
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected List Items */}
      {selectedList && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-display text-lg tracking-wider">
              {selectedList.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedList.items.length > 0 ? (
              <div className="space-y-2">
                {selectedList.items.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      item.isChecked ? "bg-muted opacity-60" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id, item.isChecked)}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                        item.isChecked
                          ? "bg-primary border-primary text-white"
                          : "border-muted-foreground"
                      }`}
                    >
                      {item.isChecked && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1">
                      <span className={item.isChecked ? "line-through" : ""}>
                        {item.ingredient}
                      </span>
                      {(item.amount || item.unit) && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({item.amount} {item.unit})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Deze lijst is leeg
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
