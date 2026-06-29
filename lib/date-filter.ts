/** Normalize a date value to YYYY-MM-DD for comparison. */
export function normalizeDateKey(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "";

  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when value falls within an inclusive from/to range (YYYY-MM-DD). */
export function matchesDateRange(
  value: string | Date | null | undefined,
  from: string,
  to: string
): boolean {
  if (!from && !to) return true;

  const key = normalizeDateKey(value);
  if (!key) return false;
  if (from && key < from) return false;
  if (to && key > to) return false;
  return true;
}

/** True when a report period overlaps the selected filter range. */
export function matchesPeriodOverlap(
  periodFrom: string | null | undefined,
  periodTo: string | null | undefined,
  filterFrom: string,
  filterTo: string
): boolean {
  if (!filterFrom && !filterTo) return true;

  const start = normalizeDateKey(periodFrom);
  const end = normalizeDateKey(periodTo || periodFrom);
  if (!start && !end) return false;

  const periodStart = start || end;
  const periodEnd = end || start;

  if (filterTo && periodStart > filterTo) return false;
  if (filterFrom && periodEnd < filterFrom) return false;
  return true;
}
