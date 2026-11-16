"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

const OPTIONS = [
  { value: "activity", label: "Recente gesprekken" },
  { value: "newest", label: "Nieuwste berichten" },
  { value: "popular", label: "Populair" },
] as const;

export function FeedSortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="relative inline-flex">
      <select
        value={value}
        aria-label="Sorteer berichten"
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", event.target.value);
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="h-10 cursor-pointer appearance-none border border-black/10 bg-white py-0 pl-4 pr-10 text-sm font-medium text-[#1d241f] shadow-[0_6px_20px_-18px_rgba(17,28,20,0.4)] outline-none transition hover:border-black/20 focus:border-[#173622]/40 community-round-pill !rounded-full"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#68706a]" />
    </div>
  );
}

export function parseFeedSort(value: string | string[] | undefined): "activity" | "newest" | "popular" {
  return value === "newest" || value === "popular" ? value : "activity";
}
