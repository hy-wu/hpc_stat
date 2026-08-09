/**
 * HTML escaping utilities for island innerHTML rendering.
 * Astro templates auto-escape, so this is only needed when
 * building HTML strings in client-side JS.
 */

const AMP = /&/g;
const LT = /</g;
const GT = />/g;
const QUOT = /"/g;
const APOS = /'/g;

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(AMP, "&amp;")
    .replace(LT, "&lt;")
    .replace(GT, "&gt;")
    .replace(QUOT, "&quot;")
    .replace(APOS, "&#039;");
}

/** Alias – same escaping is correct for HTML attributes. */
export const escapeAttr = escapeHtml;
