"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface RecipeFiltersProps {
  categories: string[];
  tags: string[];
}

export function RecipeFilters({ categories, tags }: RecipeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category");
  const currentTag = searchParams.get("tag");
  const currentSearch = searchParams.get("search") || "";

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/recipes?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/recipes");
  };

  return (
    <div className="mb-6 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zoek recepten..."
          value={currentSearch}
          onChange={(e) => updateFilter("search", e.target.value || null)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Categorie</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={currentCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter("category", currentCategory === category ? null : category)
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Tag Filters */}
      {tags.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                key={tag}
                variant={currentTag === tag ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  updateFilter("tag", currentTag === tag ? null : tag)
                }
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {(currentCategory || currentTag || currentSearch) && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Filters wissen
        </Button>
      )}
    </div>
  );
}
