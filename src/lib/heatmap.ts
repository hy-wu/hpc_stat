/**
 * Heatmap color computation shared by all pages that render
 * gradient bars inside table cells.
 */

export interface HeatStat {
  min: number;
  max: number;
}

/** Green-yellow-red gradient: 0 % → red, 50 % → yellow, 100 % → green. */
export function getHeatmapColor(percent: number): string {
  if (percent < 50)
    return `rgba(255, ${Math.floor(255 * (percent / 50))}, 0, 0.2)`;
  return `rgba(${Math.floor(255 * (1 - (percent - 50) / 50))}, 255, 0, 0.2)`;
}

import type { FieldDef } from "../types/fields";
import { isUsableNumber } from "./format";

/** Compute min/max for each heatmap-enabled column across the given rows. */
export function computeColumnStats<T>(
  rows: T[],
  fields: FieldDef[],
): Record<string, HeatStat | null> {
  const stats: Record<string, HeatStat | null> = {};
  for (const field of fields) {
    if (!field.heatmap) continue;
    let values: number[];
    if (field.type === "date") {
      values = rows
        .map((r) => (r as Record<string, unknown>)[field.key])
        .filter((v) => v && !isNaN(new Date(v as string).getTime()))
        .map((v) => new Date(v as string).getTime());
    } else {
      values = rows
        .map((r) => (r as Record<string, unknown>)[field.key])
        .filter(isUsableNumber)
        .map(Number);
    }
    stats[field.key] = values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : null;
  }
  return stats;
}
