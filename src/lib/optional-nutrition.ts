/** Missing nutrition is unknown, not zero. Explicitly entered zero is valid. */
export function sumKnownNutrition(values: Array<number | null | undefined>): number | null {
  const known = values.filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value)
  );
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}
