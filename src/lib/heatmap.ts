/**
 * Heatmap color computation shared by all pages that render
 * gradient bars inside table cells.
 */

export interface HeatStat {
  min: number;
  max: number;
}

export function getHeatmapColor(percent: number): string {
  const value = Math.max(0, Math.min(100, percent));
  if (value < 50) {
    return `rgba(255, ${Math.floor(255 * (value / 50))}, 0, 0.28)`;
  }
  return `rgba(${Math.floor(255 * (1 - (value - 50) / 50))}, 255, 0, 0.28)`;
}

/** Normalize a value to a visual score in the 0–100 range. */
export function getHeatmapPercent(
  value: number,
  stat: HeatStat,
  inverse = false,
): number {
  if (stat.max === stat.min) return 100;
  const raw = ((value - stat.min) / (stat.max - stat.min)) * 100;
  const bounded = Math.max(0, Math.min(100, raw));
  return inverse ? 100 - bounded : bounded;
}

import type { FieldDef } from "../types/fields";
import { getNestedValue, isUsableNumber } from "./format";

export function shouldHeatmapField(field: FieldDef): boolean {
  return field.heatmap === true || field.type === "number" || field.type === "date";
}

/** Compute min/max for each heatmap-enabled column across the given rows. */
export function computeColumnStats<T>(
  rows: T[],
  fields: FieldDef[],
): Record<string, HeatStat | null> {
  const stats: Record<string, HeatStat | null> = {};
  for (const field of fields) {
    if (!shouldHeatmapField(field)) continue;
    let values: number[];
    if (field.type === "date") {
      values = rows
        .map((r) => getNestedValue(r, field.key))
        .filter((v) => v && !isNaN(new Date(v as string).getTime()))
        .map((v) => new Date(v as string).getTime());
    } else {
      values = rows
        .map((r) => getNestedValue(r, field.key))
        .filter(isUsableNumber)
        .map(Number);
    }
    stats[field.key] = values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : null;
  }
  return stats;
}
