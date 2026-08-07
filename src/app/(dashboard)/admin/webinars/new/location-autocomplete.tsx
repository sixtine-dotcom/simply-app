"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export function LocationAutocomplete({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [suggestions, setSuggestions] = useState<Array<{ id: string; label: string }>>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value.trim().length < 3) { setSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/locations/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
      if (!response.ok) return;
      const data = await response.json();
      setSuggestions(data.suggestions || []);
      setOpen(true);
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value]);

  return (
    <div className="relative">
      <Input value={value} onChange={(event) => onChange(event.target.value)} onFocus={() => setOpen(true)} placeholder="Begin een adres of locatie te typen" required autoComplete="off" />
      {open && suggestions.length > 0 ? (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-white p-1 shadow-lg">
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { onChange(suggestion.label); setOpen(false); }}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{suggestion.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
