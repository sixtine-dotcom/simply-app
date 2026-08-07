export type ColorKey = "pink" | "blue" | "emerald" | "orange" | "violet" | "red" | "amber" | "teal" | "slate";

export type Category = {
  id: string;
  name: string;
  color: ColorKey;
};

export type Swatch = {
  key: ColorKey;
  label: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
};

// Fixed hue order so newly created categories get a predictable, distinguishable color.
export const SWATCHES: Swatch[] = [
  { key: "pink", label: "Roze", dot: "bg-pink-500", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  { key: "blue", label: "Blauw", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { key: "emerald", label: "Groen", dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { key: "orange", label: "Oranje", dot: "bg-orange-500", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { key: "violet", label: "Paars", dot: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  { key: "red", label: "Rood", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  { key: "amber", label: "Geel", dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  { key: "teal", label: "Turkoois", dot: "bg-teal-500", bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  { key: "slate", label: "Grijs", dot: "bg-slate-500", bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
];

export function swatchFor(color: ColorKey): Swatch {
  return SWATCHES.find((swatch) => swatch.key === color) ?? SWATCHES[SWATCHES.length - 1];
}

const STORAGE_KEY = "simply-content-categories";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "carrousel", name: "Carrousel", color: "pink" },
  { id: "sales-wheel", name: "Salescontent", color: "blue" },
  { id: "kookwheel", name: "Recept", color: "emerald" },
];

function currentCategoryNames(categories: Category[]) {
  return categories.map((category) => {
    if (category.id === "sales-wheel" || category.name.toLowerCase() === "sales wheel") {
      return { ...category, name: "Salescontent" };
    }
    if (category.id === "kookwheel" || category.name.toLowerCase().includes("kookwheel")) {
      return { ...category, name: "Recept" };
    }
    return category;
  });
}

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(stored) as Category[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_CATEGORIES;
    const updated = currentCategoryNames(parsed);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function nextAvailableColor(categories: Category[]): ColorKey {
  const used = new Set(categories.map((category) => category.color));
  const free = SWATCHES.find((swatch) => !used.has(swatch.key));
  return (free ?? SWATCHES[categories.length % SWATCHES.length]).key;
}
