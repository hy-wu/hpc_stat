/**
 * Shared cell renderers for matrix pages.
 * - scoreBars: C/A/X or M/B/C fit bars
 * - getToneClass: deterministic color class from string
 * - sourceLinks: render verification source links
 */
import { escapeHtml, escapeAttr } from "../lib/escape";
import { formatNumber } from "../lib/format";
import type { VerificationSource } from "../types/verification";

/** Render three score bars with labels (e.g. C/A/X or M/B/C). */
export function scoreBars(
  values: [number | null | undefined, number | null | undefined, number | null | undefined],
  labels: [string, string, string],
  extraClass: string = "",
): string {
  const pct = (v: number | null | undefined) =>
    v != null ? `${Math.round((v / 5) * 100)}%` : "0%";
  const fmt = (v: number | null | undefined) =>
    v != null ? formatNumber(v) : "—";
  const title = labels
    .map((l, i) => `${l} ${fmt(values[i])}/5`)
    .join(" · ");
  return `<div class="score-bars-wrap${extraClass ? " " + extraClass : ""}" title="${escapeAttr(title)}">
    <div class="score-bars">
      <div class="score-bar score-bar-c" style="width:${pct(values[0])}"></div>
      <div class="score-bar score-bar-a" style="width:${pct(values[1])}"></div>
      <div class="score-bar score-bar-x" style="width:${pct(values[2])}"></div>
    </div>
    <span class="score-text">${labels.map((l, i) => `${l} ${fmt(values[i])}`).join(" · ")}</span>
  </div>`;
}

/** Deterministic color class from string hash. */
export function getToneClass(value: string, group: string): string {
  const text = `${group}:${value}`;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  }
  return `tone-${hash % 8}`;
}

/** Render source links from verification sources array. */
export function sourceLinks(
  sources: VerificationSource[] | undefined,
  max: number = 2,
): string {
  if (!sources?.length) return "";
  return `<div class="matrix-sources">${sources
    .slice(0, max)
    .map(
      (s) =>
        `<a class="source-link matrix-source-link" href="${escapeAttr(s.url)}" target="_blank">${escapeHtml(s.label || "来源")}</a>`,
    )
    .join("")}</div>`;
}
