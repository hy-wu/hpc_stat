/**
 * Shared formatting and utility helpers (pure functions, no DOM).
 * Replaces duplicated getNestedValue / getValueAsText / average /
 * formatNumber / formatCompact / uniqueValues / slugify across 5 JS files.
 */

/** Chinese-aware collator used for sorting everywhere. */
export const sortCollator = new Intl.Collator("zh-Hans-CN", {
  numeric: true,
  sensitivity: "base",
});

/** Traverse a dot-separated key path: "pricing.official.in" → obj.pricing.official.in */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[part];
  }, obj);
}

/** Stringify any value for search / tooltip purposes. */
export function getValueAsText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === "object") {
          return Object.values(item as Record<string, unknown>)
            .map(getValueAsText)
            .filter(Boolean)
            .join(" ");
        }
        return String(item);
      })
      .join(" / ");
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(getValueAsText)
      .filter(Boolean)
      .join(" / ");
  }
  return String(value);
}

/** Average of finite numbers; returns null when no valid values. */
export function average(values: (number | null | undefined)[]): number | null {
  const clean = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v),
  );
  if (!clean.length) return null;
  return clean.reduce((s, v) => s + v, 0) / clean.length;
}

/** Locale-aware number formatting: integers stay whole, others get ≤2 decimals. */
export function formatNumber(value: number): string {
  return value.toLocaleString("zh-CN", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  });
}

/** Compact notation: 4200 → "4.2k", 78 → "78". */
export function formatCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1000) return `${formatNumber(Math.round(value / 100) / 10)}k`;
  return formatNumber(value);
}

/** Check if a value can be used as a finite number. */
export function isUsableNumber(value: unknown): value is number | string {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    Number.isFinite(Number(value))
  );
}

/** Extract unique values from an array of records via a (possibly nested) key. */
export function uniqueValues<T>(
  rows: T[],
  key: string,
  opts?: { flatArrays?: boolean },
): string[] {
  const values = rows.flatMap((row) => {
    const v = getNestedValue(row, key);
    if (opts?.flatArrays && Array.isArray(v)) return v.filter(Boolean) as string[];
    return v === null || v === undefined || v === "" ? [] : [v as string];
  });
  return [...new Set(values)].sort((a, b) =>
    sortCollator.compare(String(a), String(b)),
  );
}

/** URL-safe slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Only allow http(s) URLs. */
export function sanitizeUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
