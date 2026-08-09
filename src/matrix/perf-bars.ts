/**
 * model-hardware page specific: performance bar visualization.
 * Three vertical bars (input tok/s, output tok/s, concurrency)
 * normalized against global max values.
 */

export interface PerfMax {
  inputTps: number;
  outputTps: number;
  concurrency: number;
}

interface Record {
  inputTps?: number | null;
  outputTps?: number | null;
  concurrency?: number | null;
}

/** Compute global max values from all records (before filtering). */
export function computePerfMax(records: Record[]): PerfMax {
  return {
    inputTps: Math.max(0, ...records.map((r) => Number(r.inputTps) || 0)),
    outputTps: Math.max(0, ...records.map((r) => Number(r.outputTps) || 0)),
    concurrency: Math.max(0, ...records.map((r) => Number(r.concurrency) || 0)),
  };
}

/** Render three vertical performance bars as background. */
export function formatPerfBars(record: Record, perfMax: PerfMax): string {
  const bars = [
    { key: "inputTps" as const, value: record.inputTps, hue: 212 },
    { key: "outputTps" as const, value: record.outputTps, hue: 152 },
    { key: "concurrency" as const, value: record.concurrency, hue: 32 },
  ];
  const columns = bars
    .map((bar) => {
      const max = perfMax[bar.key] || 0;
      const ratio =
        max > 0 && bar.value != null
          ? Math.min(1, bar.value / max)
          : 0;
      if (bar.value == null)
        return `<div class="perf-bar perf-bar-empty"></div>`;
      const lightness = 74 - Math.round(ratio * 36);
      return `<div class="perf-bar" style="height:${Math.max(4, Math.round(ratio * 100))}%;background:hsl(${bar.hue}, 68%, ${lightness}%)"></div>`;
    })
    .join("");
  return `<div class="perf-bars" aria-hidden="true">${columns}</div>`;
}

/** Render text overlay for performance values. */
export function formatPerfText(record: Record): string {
  const fmt = (v: number | null | undefined) => {
    if (v == null) return "—";
    if (v >= 1000) return `${Math.round(v / 100) / 10}k`;
    return String(v);
  };
  const inTps = record.inputTps != null ? `↑${fmt(record.inputTps)}` : "↑—";
  const outTps = record.outputTps != null ? `↓${fmt(record.outputTps)}` : "↓—";
  const conc = record.concurrency != null ? `${fmt(record.concurrency)} 并发` : "并发—";
  return `<div class="perf-text">
    <span class="perf-seg perf-seg-left">${inTps}</span>
    <span class="perf-seg perf-seg-center">${outTps}</span>
    <span class="perf-seg perf-seg-right">${conc}</span>
  </div>`;
}
